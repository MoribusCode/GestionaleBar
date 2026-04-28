const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);

module.exports = function (fastify, opts, done) {

    // GET (only admin) - endpoint per avere tutti gli item con quantità corrente in inventario
    fastify.get('/inventory-overview',
        { preHandler: fastify.authorize(['admin']) },
        async (request, reply) => {
            try {
                const items = await dbAll(`
                    SELECT
                        i.id,
                        i.name,
                        i.category,
                        i.practical_unit,
                        i.minimum_stock,
                        COALESCE(inv.quantity, 0) AS current_quantity
                    FROM items i
                    LEFT JOIN inventory inv ON inv.item_id = i.id
                    ORDER BY i.name ASC
                `);

                return { items };
            } catch (err) {
                reply.code(500).send({ error: err.message });
            }
        }
    );

    // GET - endpoint per fare un fetch degli articoli flaggati come item_purchase (in inventario)
    fastify.get('/purchase-items', async (request, reply) => {
        try {
            const items = await dbAll('SELECT * FROM items WHERE item_purchase = 1');
            return { items };
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });


    // GET - endpoint per fare un fetch degli articoli flaggati come item_sale (in vendita)
    fastify.get('/sale-items', async (request, reply) => {
        try {
            const items = await dbAll('SELECT * FROM items WHERE item_sale = 1');
            return { items };
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
    
    // PUT - endpoint per aggiornare la quantità in inventario, e quantità minima e note nella tabella items
    fastify.put('/update-inventory/:id',
        { preHandler: fastify.authorize(['admin']) },
        async (request, reply) => {
        try {
            const { id } = request.params;
            const { quantity } = request.body;

            if (quantity === undefined || Number.isNaN(Number(quantity))) {
                return reply.code(400).send({ error: 'Quantita non valida' });
            }

            const item = await dbAll('SELECT id, name FROM items WHERE id = ?', [id]);

            if (!item.length) {
                return reply.code(404).send({ error: 'Articolo non trovato' });
            }

            await dbRun(
                `INSERT INTO inventory (item_id, item_name, quantity)
                 VALUES (?, ?, ?)
                 ON CONFLICT(item_id)
                 DO UPDATE SET
                    item_name = excluded.item_name,
                    quantity = excluded.quantity`,
                [id, item[0].name, Number(quantity)]
            );

            reply.code(200).send({ message: 'Inventario aggiornato' });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    done();
};