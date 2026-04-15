const bcrypt = require('bcrypt');
const db = require('../Database/database');
const util = require('util');

const dbAll = util.promisify(db.all).bind(db);
const dbRun = util.promisify(db.run).bind(db);

module.exports = function (fastify, opts, done) {

    // endpoint per creare l'utente
    fastify.post('/create-user',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {

            try {
                const { username, password, role } = request.body;

                // Hash the admin password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const user = await dbRun('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    [username, hashedPassword, role]
                );

                reply.code(201).send("utente creato: ", user);
            }
            catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        });

    // endpoint che mi restituisce tutti gli utenti
    fastify.get('/users',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {

            try {
                const users = await dbAll('SELECT id, username, role FROM users');
                return { users };

            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        });

    // endpoint per eliminare un utente
    fastify.delete('/delete-user/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {

            try {
                const { id } = request.params;
                await dbRun('DELETE FROM users WHERE id = ?',
                    [id]
                );

            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        });

    done();
};