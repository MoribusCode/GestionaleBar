const db = require('../Database/database');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbAll = util.promisify(db.all).bind(db);
const dbGet = util.promisify(db.get).bind(db);

// dbRun che restituisce lastID (util.promisify perde il "this" del callback di sqlite3, serve per l'id appena creato)
function dbRunWithResult(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// colonne pubbliche degli items: niente image_data (il blob), solo un flag has_image per sapere se
// vale la pena chiamare /item-image/:id
const ITEM_COLUMNS = `
    id, name, price, category, note, minimum_stock, practical_unit,
    item_sale, item_purchase, item_favorite, (image_data IS NOT NULL) AS has_image
`;

module.exports = function (fastify, opts, done) {

    // GET - endpoint per fetchare gli item dal db: tutti se admin, solo le categorie del proprio bar altrimenti
    fastify.get("/get-items",
        { preHandler: fastify.authorize([]) }, async (request, reply) => {
            try {
                if (request.user.role === 'admin') {
                    const items = await dbAll(`SELECT ${ITEM_COLUMNS} FROM items`);
                    return { items };
                }

                console.log("request.user.bar_id: ", request.user.bar_id);

                const bar = await dbGet("SELECT categories FROM bar WHERE id = ?", [request.user.bar_id]);
                if (!bar) return reply.code(404).send({ error: "Bar non trovato" });

                const categories = JSON.parse(bar.categories);
                if (categories.length === 0) return { items: [] };

                const placeholders = categories.map(() => '?').join(',');
                const items = await dbAll(
                    `SELECT ${ITEM_COLUMNS} FROM items WHERE lower(category) IN (${placeholders})`,
                    categories.map(c => c.toLowerCase())
                );
                return { items };

            } catch (err) {
                console.error("Errore durante il recupero degli articoli:", err.message);
                return reply.status(500).send({ error: err.message });
            }
        });

    // GET - endpoint per fetchare tutti gli item dal db nel catalogo (solo quelli in vendita)
    fastify.get("/get-items-catalog", { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            if (request.user.role === 'admin') {
                const items = await dbAll(`SELECT ${ITEM_COLUMNS} FROM items WHERE item_sale = 1`);
                return { items };
            }

            const bar = await dbGet("SELECT categories FROM bar WHERE id = ?", [request.user.bar_id]);
            if (!bar) return reply.code(404).send({ error: "Bar non trovato" });

            const categories = JSON.parse(bar.categories);
            if (categories.length === 0) return { items: [] };

            const placeholders = categories.map(() => '?').join(',');
            const items = await dbAll(
                `SELECT ${ITEM_COLUMNS} FROM items WHERE lower(category) IN (${placeholders}) AND item_sale = 1`,
                categories.map(c => c.toLowerCase())
            );
            return { items };


        } catch (err) {
            console.error("Errore durante il recupero degli articoli:", err.message);
            return reply.status(500).send({ error: err.message });
        }
    });

    
    // GET - restituisce l'immagine (blob) di un articolo, con cache lato browser
    fastify.get('/item-image/:id', { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const { id } = request.params;
            const row = await dbGet('SELECT image_data, image_mime_type FROM items WHERE id = ?', [id]);

            if (!row || !row.image_data) {
                return reply.code(404).send();
            }

            if(!row.image_mime_type) {
                return reply.code(404).send();
            }

            reply.header('Cache-Control', 'public, max-age=86400'); //molto importante: cache lato browser 
            reply.type(row.image_mime_type);
            return reply.send(row.image_data);
        } catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });

    // POST (only admin) - carica/sostituisce l'immagine di un articolo
    fastify.post('/item-image/:id', { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            const file = await request.file();

            if (!file) {
                return reply.code(400).send({ error: 'Nessun file ricevuto' });
            }

            const buffer = await file.toBuffer();
            await dbRun('UPDATE items SET image_data = ?, image_mime_type = ? WHERE id = ?', [buffer, file.mimetype, id]);

            reply.code(200).send({ message: 'Immagine caricata con successo' });
        } catch (err) {
            console.error('Errore upload immagine articolo:', err.message);
            reply.code(500).send({ error: err.message });
        }
    });

    // POST (only admin) - endpoint per aggiungere un item
    fastify.post('/add-item',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const { name, price, category, note, min_stock, practical_unit, flag_sale, flag_purchase, flag_favorite } = request.body;

                const result = await dbRunWithResult(`INSERT INTO items
                (name, price, category, note, minimum_stock, practical_unit, item_sale, item_purchase, item_favorite)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, price, category, note, min_stock, practical_unit, flag_sale, flag_purchase, flag_favorite]
                );

                reply.code(201).send({ message: "articolo creato con successo", id: result.lastID });

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
                    flag_purchase: 'item_purchase',
                    flag_favorite: 'item_favorite'
                };

                const updateFields = [];
                const values = [];

                for (const [key, value] of Object.entries(data)) {

                    if (fieldMap[key] && value !== undefined) {
                        updateFields.push(`${fieldMap[key]} = ?`),
                            values.push(value);
                    }
                }

                if (updateFields.length === 0) {
                    return reply.code(400).send({ message: "No valid field to update" });
                }

                values.push(id);

                const query = `UPDATE items SET ${updateFields.join(', ')} WHERE id = ?`;

                // mando la query 
                const result = await dbRun(query, values);

                reply.code(200).send({ message: "Articolo aggiornato con successo" });

            } catch (err) {
                console.error("ERRORE CRUD /update-item: ", err);
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

    done();
}