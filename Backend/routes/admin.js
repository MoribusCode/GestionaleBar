const fp = require('fastify-plugin');

module.exports = fp(async (fastify, opts) => {

    fastify.get('/admin/dashboard', { preHandler: [fastify.authorize(['admin'])] }, async (request, reply) => {
        // only accessible by 'admin' users
        return { message: 'Welcome to the admin dashboard!', user: request.user };
    });

    fastify.get('/admin/users', { preHandler: [fastify.authorize(['admin'])] }, async (request, reply) => {
        // only accessible by 'admin' users
        const users = await dbGet('SELECT * FROM users');
        return { users };
    });
});