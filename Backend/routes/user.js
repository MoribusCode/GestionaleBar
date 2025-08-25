module.exports = function (fastify, opts, done) {

    fastify.get('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        return { user: request.user };
    });

    done();
};