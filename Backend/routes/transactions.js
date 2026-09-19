const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);
const dbGet = util.promisify(db.get).bind(db);

module.exports = function (fastify, opts, done) {

    // GET - endpoint per fare un fetch di tutte le transazioni effettuate
    fastify.get('/get-transactions', { preHandler: fastify.authorize() }, async (request, reply) => {
        try {
            const transactions = await dbAll(`
                SELECT
                    transaction_id,
                    date,
                    amount,
                    type,
                    description,
                    receipt_name,
                    receipt_mime_type,
                    receipt_data,
                    (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.transaction_id) AS items_count
                FROM transactions t
                ORDER BY datetime(t.date) DESC, t.transaction_id DESC
            `);

            return { transactions };
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    // GET - articoli venduti nella chiusura collegata a una transazione
    fastify.get('/transaction-items/:id', { preHandler: fastify.authorize() }, async (request, reply) => {
        try {
            const { id } = request.params;
            const transaction = await dbGet(
                `SELECT transaction_id, date, amount, description
                 FROM transactions
                 WHERE transaction_id = ?`,
                [id]
            );

            if (!transaction) {
                return reply.code(404).send({ message: 'Transazione non trovata' });
            }

            const items = await dbAll(
                `SELECT item_name, quantity, unit_price, total_price
                 FROM transaction_items
                 WHERE transaction_id = ?
                 ORDER BY item_name COLLATE NOCASE`,
                [id]
            );

            return { transaction, items };
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    // POST - endpoint per regitrare una transazione (entrata o uscita)
    fastify.post('/add-transaction', { preHandler: fastify.authorize() }, async (request, reply) => {
        try {
            const {
                amount,
                type,
                description,
                receiptName = null,
                receiptMimeType = null,
                receiptData = null
            } = request.body || {};

            const parsedAmount = Number(amount);

            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                return reply.code(400).send({ message: 'Amount non valido' });
            }

            if (type !== 'IN' && type !== 'OUT') {
                return reply.code(400).send({ message: 'Type non valido' });
            }

            await dbRun(
                `INSERT INTO transactions
                (amount, type, description, receipt_name, receipt_mime_type, receipt_data)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    parsedAmount,
                    type,
                    description || null,
                    receiptName,
                    receiptMimeType,
                    receiptData
                ]
            );

            if (fastify.io) {
                fastify.io.emit('transaction-updated');
            }

            reply.code(201).send({ message: 'Transaction added successfully' });

        } catch (err) {
            console.error('Error adding transaction:', err);
            reply.code(500).send({ message: 'Failed to add transaction' });
        }
    });

    // PUT (only admin) - endpoint per modificare una transazione 
    fastify.put('/update-transaction/:id', 
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            const {
                amount,
                type,
                description,
                receiptName,
                receiptMimeType,
                receiptData
            } = request.body || {};

            const existingTransaction = await dbGet(
                `SELECT receipt_name, receipt_mime_type, receipt_data
                 FROM transactions
                 WHERE transaction_id = ?`,
                [id]
            );

            if (!existingTransaction) {
                return reply.code(404).send({ message: 'Transazione non trovata' });
            }

            const parsedAmount = Number(amount);

            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                return reply.code(400).send({ message: 'Amount non valido' });
            }

            if (type !== 'IN' && type !== 'OUT') {
                return reply.code(400).send({ message: 'Type non valido' });
            }

            await dbRun(`UPDATE transactions SET 
                amount = ?, 
                type = ?, 
                description = ?,
                receipt_name = ?,
                receipt_mime_type = ?,
                receipt_data = ?
                WHERE transaction_id = ?`,
            [
                parsedAmount,
                type,
                description || null,
                receiptName !== undefined ? receiptName : existingTransaction.receipt_name,
                receiptMimeType !== undefined ? receiptMimeType : existingTransaction.receipt_mime_type,
                receiptData !== undefined ? receiptData : existingTransaction.receipt_data,
                id
            ]);

            if (fastify.io) {
                fastify.io.emit('transaction-updated');
            }

            reply.code(200).send({ message: 'transazione aggiornata con successo' });
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }   
    });

    // DELETE (only admin) - endpoint per eliminare una transazione
    fastify.delete('/delete-transaction/:id', 
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            await dbRun('DELETE FROM transactions WHERE transaction_id = ?', [id]);

            if (fastify.io) {
                fastify.io.emit('transaction-updated');
            }

            reply.code(200).send({ message: 'transazione eliminata con successo' });
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    done();
};