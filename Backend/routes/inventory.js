const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);

module.exports = function (fastify, opts, done) {

    // endpoint per fare un fetch degli articoli flaggati come item_purchase (in inventario)
    fastify.get('/purchase-items', async (request, reply) => {
        try {
            const items = await dbAll('SELECT * FROM items WHERE item_purchase = 1');
            return { items };
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });


    // endpoint per fare un fetch degli articoli flaggati come item_sale (in vendita)
    fastify.get('/sale-items', async (request, reply) => {
        try {
            const items = await dbAll('SELECT * FROM items WHERE item_sale = 1');
            return { items };
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
    
    // PUT - endpoint per aggiornare la quantità in inventario, e quantità minima e note nella tabella items
    fastify.put('/update-inventory/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { quantity } = request.body;

            await dbRun('UPDATE inventory SET quantity = ? WHERE item_id = ?', [quantity, id]);

            reply.code(200).send({ message: 'Inventario aggiornato' });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    done();
};