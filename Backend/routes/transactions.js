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

            const orderRows = await dbAll(
                `SELECT id, order_number, created_at, total_price, payment_method, items
                 FROM transaction_orders
                 WHERE transaction_id = ?
                 ORDER BY datetime(created_at) ASC`,
                [id]
            );
            const orders = orderRows.map(row => ({
                id: row.id,
                orderNumber: row.order_number,
                createdAt: row.created_at,
                totalPrice: row.total_price,
                paymentMethod: row.payment_method,
                items: JSON.parse(row.items)
            }));

            return { transaction, items, orders };
        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    // POST - ristampa lo scontrino di un ordine di una chiusura passata (lo storico ordini in
    // "Visualizza giornata"): l'ordine originale non esiste più nelle tabelle orders/order_items
    // (cancellate alla chiusura), quindi si ricostruisce dallo snapshot in transaction_orders
    fastify.post('/transaction-orders/:id/reprint', { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const { id } = request.params;

            const order = await dbGet(
                `SELECT id, order_number, total_price, payment_method, items, bar_id
                 FROM transaction_orders
                 WHERE id = ?`,
                [id]
            );

            if (!order) {
                return reply.code(404).send({ message: 'Ordine non trovato' });
            }

            const isAdmin = request.user.role === 'admin';
            if (!isAdmin && order.bar_id !== request.user.bar_id) {
                return reply.code(403).send({ message: 'Non puoi ristampare un ordine di un altro bar' });
            }

            const bar = await dbGet('SELECT printer_ip, print_tags FROM bar WHERE id = ?', [order.bar_id]);
            if (!bar) {
                return reply.code(404).send({ message: 'Bar non trovato' });
            }

            const categories = await dbAll('SELECT name, prefix FROM categories');
            const prefixByCategory = {};
            for (const category of categories) {
                prefixByCategory[category.name] = category.prefix || '';
            }

            const items = JSON.parse(order.items);

            // lo snapshot salva solo nome/quantità/prezzo (non la categoria di allora): per
            // raggruppare comunque i tagliandini postazione si usa la categoria ATTUALE
            // dell'articolo nel catalogo, un'approssimazione ma migliore di nessun raggruppamento
            const catalogItems = items.length > 0
                ? await dbAll(
                    `SELECT name, category FROM items WHERE name IN (${items.map(() => '?').join(', ')})`,
                    items.map(item => item.name)
                )
                : [];
            const categoryByItemName = {};
            for (const catalogItem of catalogItems) {
                categoryByItemName[catalogItem.name] = catalogItem.category;
            }

            const orderData = {
                id: order.id,
                order_number: order.order_number,
                items: items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: Number(item.price || 0),
                    category: categoryByItemName[item.name],
                    prefix: prefixByCategory[categoryByItemName[item.name]] || ''
                })),
                note: '',
                totalPrice: order.total_price,
                paymentMethod: order.payment_method,
                printTags: !!bar.print_tags
            };

            await fastify.printer.stampaScontrino(orderData, bar.printer_ip);

            return reply.send({ message: 'Scontrino ristampato con successo' });
        } catch (err) {
            console.error('Errore durante la ristampa dello scontrino:', err.message);
            return reply.code(500).send({ message: err.message });
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