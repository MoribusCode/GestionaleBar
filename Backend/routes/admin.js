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
                const { username, password, role, bar_id, categories } = request.body;

                if (role === 'admin' && bar_id) {
                    return reply.code(400).send({ error: 'Un admin non può essere associato a un bar' });
                }

                // Hash the admin password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                const db_categories = JSON.stringify(categories || []); //Se non definito, salvo un array vuoto

                const user = await dbRun('INSERT INTO users (username, password, role, bar_id, categories) VALUES (?, ?, ?, ?, ?)',
                    [username, hashedPassword, role, bar_id, db_categories]
                );

                reply.code(201).send("utente creato con successo");
            }
            catch (err) {
                console.error('Errore creazione utente:', err.message);
                reply.code(500).send({ error: err.message });
            }
        });

    // endpoint che mi restituisce tutti gli utenti
    fastify.get('/users',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const users = await dbAll('SELECT id, username, role, bar_id, categories FROM users');
                const parsedUsers = users.map(user => ({
                    ...user,
                    categories: JSON.parse(user.categories || '[]')
                }));
                return { users: parsedUsers };

            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        });

    fastify.get('/bars',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {
            try {
                const bars = await dbAll('SELECT * FROM bar');
                
                const parsedBars = bars.map(bar => {
                    return {
                        ...bar,
                        categories: JSON.parse(bar.categories)
                    };
                });

                return { bars: parsedBars };

            } catch (err) {
                reply.code(500).send({ error: 'Internal Server Error' });
            }
        });


    // endpoint per aggiornare un utente
    fastify.put('/update-user/:id',
        { preHandler: fastify.authorize(['admin']) }, async (request, reply) => {

            try {
                const { id } = request.params;
                const { username, password, role, bar_id, categories } = request.body;

                if (role === 'admin' && bar_id) {
                    return reply.code(400).send({ error: 'Un admin non può essere associato a un bar' });
                }

                const fields = ['username = ?', 'role = ?', 'bar_id = ?', 'categories = ?'];
                const values = [username, role, bar_id, JSON.stringify(categories || [])];

                if (password) {
                    const saltRounds = 10;
                    const hashedPassword = await bcrypt.hash(password, saltRounds);
                    fields.push('password = ?');
                    values.push(hashedPassword);
                }

                values.push(id);

                await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

                reply.code(200).send({ message: 'Utente aggiornato con successo' });
            } catch (err) {
                console.error('Errore aggiornamento utente:', err.message);
                reply.code(500).send({ error: err.message });
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

                const db_categories = JSON.stringify(categories);

                await dbRun('INSERT INTO bar (printer_ip, categories) VALUES (?, ?)', [printer_ip, db_categories]);

                reply.code(201).send({ message: 'Bar creato con successo' });
            } catch (err) {
                console.error(err);
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