const fp = require('fastify-plugin');

module.exports = fp(async (fastify, opts) => {

    fastify.get('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        return { user: request.user };
    });

});