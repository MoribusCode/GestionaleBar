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
