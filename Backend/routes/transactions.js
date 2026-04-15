const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);

module.exports = function (fastify, opts, done) {
    
    // GET - endpoint per fare un fetch di tutte le transazioni effettuate
    fastify.get('/get-transactions', async (request, reply) => {
        try {
            const transactions = await dbAll('SELECT * FROM transactions');
            return { transactions }; 
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    // POST - endpoint per regitrare una transazione (entrata o uscita)
    fastify.post('/add-transaction', async (request, reply) => {
        try {
            const { amount, type, description } = request.body;
            await dbRun('INSERT INTO transactions (amount, type, description) VALUES (?, ?, ?)', [amount, type, description]);
            
            reply.code(200).send({ message: 'Transaction added successfully' });

        } catch (err) {
            console.error('Error adding transaction:', err);
            reply.code(500).send({ message: 'Failed to add transaction' });
        }
    });

    // PUT (only admin) - endpoint per modificare una transazione 
    fastify.put('/update-transaction/:id', 
        { preHandler: fastify.authorize['admin'] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { amount, type, description } = request.body;

            await dbRun(`UPDATE transactions SET 
                amount = ?, 
                type = ?, 
                description = ?
                WHERE transaction_id = ?`,
            [amount, type, description, id]);

            reply.code(500).send({ message: 'transazione aggiornata con successo' });
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }   
    });

    // DELETE (only admin) - endpoint per eliminare una transazione
    fastify.delete('/delete-transaction/:id', 
        { preHandler: fastify.authorize['admin'] }, async (request, reply) => {
        try {
            const { id } = request.params;
            await dbRun('DELETE FROM transactions WHERE transaction_id = ?', [id]);

            reply.code(200).send({ message: 'transazione eliminata con successo' });
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    

    done();
};