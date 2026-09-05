const db = require('../Database/database');
const util = require('util');

const dbAll = util.promisify(db.all).bind(db);
const dbRun = util.promisify(db.run).bind(db);

function dbRunWithResult(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

module.exports = function (fastify, opts, done) {

    // GET - tutte le categorie
    fastify.get('/categories', { preHandler: fastify.authorize([]) }, async (request, reply) => {
        try {
            const categories = await dbAll('SELECT id, name, auto_complete FROM categories ORDER BY name ASC');
            const parsedCategories = categories.map(category => ({ ...category, auto_complete: !!category.auto_complete }));
            return { categories: parsedCategories };
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // POST (only admin) - crea una categoria
    fastify.post('/create-category', { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { name, auto_complete } = request.body;

            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Il nome della categoria è obbligatorio' });
            }

            const result = await dbRunWithResult('INSERT INTO categories (name, auto_complete) VALUES (?, ?)', [name.trim(), auto_complete ? 1 : 0]);
            reply.code(201).send({ message: 'Categoria creata con successo', id: result.lastID });
        } catch (err) {
            if (err.message?.includes('UNIQUE')) {
                return reply.code(400).send({ error: 'Esiste già una categoria con questo nome' });
            }
            reply.code(500).send({ error: err.message });
        }
    });

    // PUT (only admin) - rinomina/aggiorna una categoria
    fastify.put('/update-category/:id', { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { name, auto_complete } = request.body;

            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Il nome della categoria è obbligatorio' });
            }

            await dbRun('UPDATE categories SET name = ?, auto_complete = ? WHERE id = ?', [name.trim(), auto_complete ? 1 : 0, id]);
            reply.code(200).send({ message: 'Categoria aggiornata con successo' });
        } catch (err) {
            if (err.message?.includes('UNIQUE')) {
                return reply.code(400).send({ error: 'Esiste già una categoria con questo nome' });
            }
            reply.code(500).send({ error: err.message });
        }
    });

    // DELETE (only admin) - elimina una categoria 
    fastify.delete('/delete-category/:id', { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
        try {
            const { id } = request.params;
            await dbRun('DELETE FROM categories WHERE id = ?', [id]);
            reply.code(200).send({ message: 'Categoria eliminata con successo' });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    done();
};
