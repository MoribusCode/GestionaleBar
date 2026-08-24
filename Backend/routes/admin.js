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

    // endpoint per creare un bar
    fastify.post('/create-bar', 
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const { printer_ip, categories } = request.body;

                printer_ip = request.body.printer_ip;
                categories = request.body.categories;

                const db_categories = JSON.stringify(categories);

                await dbRun ('INSERT INTO bar (printer_ip, categories) VALUES (?, ?)', [printer_ip, db_categories]);

                reply.code(201).send({ message: 'Bar creato con successo' });
            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        }    
    )

    // endpoint per aggiornare un bar
    fastify.put('/update-bar/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const { id } = request.params;
                const { printer_ip, categories } = request.body;

                const db_categories = JSON.stringify(categories);

                await dbRun('UPDATE bar SET printer_ip = ?, categories = ? WHERE id = ?', [printer_ip, db_categories, id]);

                reply.code(200).send({ message: 'Bar aggiornato con successo' });
            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        } 
    )   

    // endpoint per eliminare un bar
    fastify.delete('/delete-bar/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const { id } = request.params;
                const users = await dbAll('SELECT * FROM users WHERE bar_id = ?', [id]);

                if (users.length > 0) {
                    return reply.code(400).send({ error: 'Impossibile eliminare il bar: ci sono utenti associati a questo bar' });
                }
                
                await dbRun('DELETE FROM bar WHERE id = ?', [id]);

                reply.code(200).send({ message: 'Bar eliminato con successo' });
            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });   
            }
        }
    )

    done();
};