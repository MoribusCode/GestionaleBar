const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);

module.exports = function (fastify, opts, done) {

    // GET - endpoint per fetchare tutti gli item dal db
    fastify.get("/items", async (request, reply) => {
        try {
            const items = await dbAll("SELECT * FROM items");
            return { items };
            
        } catch (err) {
            console.error("Errore durante il recupero degli articoli:", err.message);
            return reply.status(500).send({ error: err.message });
        }
    });

    // POST (only admin) - endpoint per aggiungere un item
    fastify.post('/add-item',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { name, price, category, note, min_stock, practical_unit, flag_sale, flag_purchase } = request.body;

            const item = await dbRun(`INSERT INTO items 
                (name, price, category, note, minimum_stock, practical_unit, item_sale, item_purchase) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)'`,
                [name, price, category, note, min_stock, practical_unit, flag_sale, flag_purchase]
            );

            reply.code(201).send({ message: "articolo creato: ", item });

        } catch (err) {
            reply.code(500).send({ message: err.message });
        }
    });

    // PATCH (only admin) - endpoint per aggiornare parzialmente un item
    fastify.patch('/update-item/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;

            // mappo gli oggetti (dizionario)
            const fieldMap = {
                name: 'name',
                price: 'price', 
                category: 'category',
                note: 'note',
                min_stock: 'minimum_stock',
                practical_unit: 'practical_unit',
                flag_sale: 'item_sale',
                flag_purchase: 'item_purchase'
            };
            
            const updateFields = [];
            const values = [];

            for ( const [key, value] of Object.entries(data) ) {
                
                if (fieldMap[key] && value !== undefined ) {
                    updateFields.push(`${fieldMap[key]} = ?`),
                    values.push(value);
                }
            }

            if (updateFields.length === 0) {
                return reply.code(400).send({ message: "No valid field to update"});
            }

            values.push(id);

            const query = `UPDATE items SET ${updateFields.join(', ')} WHERE id = ?`;

            // mando la query 
            const result = await dbRun(query, values);

            reply.code(200).send({ message: "Articolo aggiornato con successo" });

        } catch (err) {
            console.error("ERRORE CRUD /update-item:", err);
            reply.code(500).send({ message: err.message });
        }
    });

    // DELETE (only admin) - endpoint che mi permette di eliminare un item 
    fastify.delete('/delete-item/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            await dbRun('DELETE FROM items WHERE id = ?', [id]);

        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
        
    done ();
}