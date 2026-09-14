const db = require("../Database/database");
const util = require("util");
const dbGet = util.promisify(db.get).bind(db);

module.exports = function (fastify, opts, done) {

    // GET - dice se il POS è abilitato per il bar dell'utente loggato (usato per
    // mostrare o meno il pulsante "POS" in cassa)
    fastify.get("/pos/enabled", { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const barId = request.user.bar_id;
            if (!barId) return { enabled: false };

            const bar = await dbGet('SELECT pos_enabled FROM bar WHERE id = ?', [barId]);
            return { enabled: !!(bar && bar.pos_enabled) };
        } catch (err) {
            console.error("Errore lettura pos_enabled:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // POST - avvia un pagamento sul lettore SumUp
    fastify.post("/pos/checkout", { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const { amount, description } = request.body || {};

            if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                return reply.status(400).send({ message: "Importo non valido" });
            }

            const barId = request.user.bar_id;
            const { clientTransactionId } = await fastify.sumup.createCheckout(Number(amount), description, barId);
            return reply.status(201).send({ clientTransactionId });
        } catch (err) {
            if (err.code === 'SUMUP_READER_BUSY') {
                return reply.status(409).send({ message: err.message });
            }
            console.error("Errore avvio pagamento POS:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // POST - annulla il pagamento in corso sul lettore. Solo chi conosce il clientTransactionId
    // del checkout in corso può annullarlo (lo conosce solo chi l'ha creato, vedi sumup.js)
    fastify.post("/pos/checkout/terminate", { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const { clientTransactionId } = request.body || {};
            await fastify.sumup.terminateCheckout(clientTransactionId);
            return { message: "Pagamento annullato" };
        } catch (err) {
            if (err.code === 'SUMUP_NOT_OWNER') {
                return reply.status(403).send({ message: err.message });
            }
            console.error("Errore annullamento pagamento POS:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // POST - webhook chiamato da SumUp (return_url) quando lo stato del checkout cambia.
    fastify.post("/pos/webhook", async (request, reply) => {
        try {
            const { barId, status, clientTransactionId } = fastify.sumup.resolveWebhook(request.body || {});
            fastify.log.info(`SumUp webhook ricevuto: status=${status} barId=${barId}`);

            if (barId) {
                fastify.io.to(`bar-${barId}`).emit('pos-payment-status', { status, clientTransactionId });
            }

            return reply.status(200).send({ received: true });
        } catch (err) {
            console.error("Errore gestione webhook POS:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    done();
};
