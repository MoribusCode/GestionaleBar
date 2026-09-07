const fp = require('fastify-plugin');
const { SumUp } = require('@sumup/sdk');

// Integrazione con il lettore POS SumUp via Cloud API
module.exports = fp(async (fastify, opts) => {

    const apiKey = process.env.SUMUP_API_KEY;
    const merchantCode = process.env.SUMUP_MERCHANT_CODE;
    const readerId = process.env.SUMUP_READER_ID;

    const client = apiKey ? new SumUp({ apiKey }) : null;

    function assertConfigured() {
        if (!client || !merchantCode || !readerId) {
            throw new Error('SumUp non configurato: impostare SUMUP_API_KEY, SUMUP_MERCHANT_CODE, SUMUP_READER_ID nel .env');
        }
    }

    // activeClientTransactionId è l'unica fonte di verità su "il lettore è occupato" e su "chi può
    let activeClientTransactionId = null;
    let activeBarId = null;

    let creatingCheckout = false;

    function resetActiveCheckout() {
        activeClientTransactionId = null;
        activeBarId = null;
    }

    // avvia un pagamento sul lettore collegato, ritorna il client_transaction_id da conservare
    // per autorizzare l'eventuale annullamento in seguito.
    async function createCheckout(amount, description, barId) {
        assertConfigured();

        if (activeClientTransactionId !== null || creatingCheckout) {
            const err = new Error("POS in uso da un'altra postazione");
            err.code = 'SUMUP_READER_BUSY';
            throw err;
        }

        creatingCheckout = true;
        try {
            const { data: wrapper, response } = await client.readers.createCheckoutWithResponse(merchantCode, readerId, {
                total_amount: {
                    currency: 'EUR',
                    minor_unit: 2,
                    value: Math.round(amount * 100)
                },
                description,
                ...(process.env.SUMUP_WEBHOOK_URL ? { return_url: process.env.SUMUP_WEBHOOK_URL } : {})
            });

            // *WithResponse avvolge la risposta in { data, response }: siccome CreateReaderCheckoutResponse
            // ha già di suo un campo "data", i valori veri sono un livello più in profondità (wrapper.data)
            const data = wrapper.data;

            fastify.log.info(`SumUp checkout creato (HTTP ${response.status}): client_transaction_id=${data.client_transaction_id}`);

            activeClientTransactionId = data.client_transaction_id || null;
            activeBarId = barId;

            return { clientTransactionId: activeClientTransactionId };
        } finally {
            creatingCheckout = false;
        }
    }

    // interpreta la chiamata del webhook SumUp (return_url)
    function resolveWebhook(body) {
        const eventPayload = body.payload || {};
        const clientTransactionId = eventPayload.client_transaction_id || null;
        const rawStatus = String(eventPayload.status || '').toLowerCase();
        const status = ['successful', 'failed', 'cancelled'].includes(rawStatus) ? rawStatus : 'pending';

        console.log(`Webhook SumUp ricevuto: client_transaction_id=${clientTransactionId} status=${status}`);

        // il lettore è unico: se questo evento riguarda il checkout attualmente tracciato,
        // liberiamo lo stato e diciamo alla route in quale room notificarlo (bar-<barId>)
        const isActiveCheckout = clientTransactionId && clientTransactionId === activeClientTransactionId;
        const barId = isActiveCheckout ? activeBarId : null;

        if (status !== 'pending' && isActiveCheckout) {
            resetActiveCheckout();
        }

        return { barId, status, clientTransactionId };
    }

    function mapSimpleStatus(simpleStatus) {
        switch (simpleStatus) {
            case 'SUCCESSFUL':
            case 'PAID_OUT':
                return 'successful';
            case 'CANCELLED':
                return 'cancelled';
            case 'FAILED':
            case 'CANCEL_FAILED':
            case 'REFUND_FAILED':
            case 'CHARGEBACK':
            case 'NON_COLLECTION':
                return 'failed';
            default:
                return 'pending';
        }
    }

    // Rete di sicurezza nel caso il webhook di SumUp non arrivi
    async function pollActiveCheckoutStatus() {
        const trackedId = activeClientTransactionId;
        if (!trackedId || !client || !merchantCode) return;

        try {
            const transaction = await client.transactions.get(merchantCode, { client_transaction_id: trackedId });
            const status = mapSimpleStatus(transaction.simple_status);

            // se nel frattempo è arrivato il webhook (o è cambiato il checkout tracciato) non c'è più nulla da fare
            if (status === 'pending' || trackedId !== activeClientTransactionId) return;

            const barId = activeBarId;
            resetActiveCheckout();

            fastify.log.info(`SumUp poll: risolto client_transaction_id=${trackedId} status=${status}`);
            if (barId && fastify.io) {
                fastify.io.to(`bar-${barId}`).emit('pos-payment-status', { status, clientTransactionId: trackedId });
            }
        } catch (err) {
            // spesso è solo il caso in cui la transazione non è ancora comparsa lato SumUp: si ritenta al giro dopo
            fastify.log.warn(`SumUp poll di stato fallito per client_transaction_id=${trackedId}: ${err.message}`);
        }
    }

    setInterval(pollActiveCheckoutStatus, 10000);

    // annulla il pagamento in corso.
    async function terminateCheckout(requestingClientTransactionId) {
        assertConfigured();

        if (activeClientTransactionId !== null && requestingClientTransactionId !== activeClientTransactionId) {
            const err = new Error("Pagamento in corso avviato da un'altra postazione: non puoi annullarlo");
            err.code = 'SUMUP_NOT_OWNER';
            throw err;
        }

        await client.readers.terminateCheckout(merchantCode, readerId);
        resetActiveCheckout();
    }

    fastify.decorate('sumup', {
        createCheckout,
        resolveWebhook,
        terminateCheckout,
        isInUse: () => activeClientTransactionId !== null
    });

});
