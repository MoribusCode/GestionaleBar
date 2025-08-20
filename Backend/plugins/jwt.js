const fp = require('fastify-plugin');
const jwt = require('@fastify/jwt');

module.exports = fp(async (fastify, opts) => {
    fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        sign: {
            expiresIn: '1h'
        },
        cookie: {
            cookieName: 'token',
            signed: true
        }
    });

    // authentication middleware - verify the JWT token
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send(err);
        }
    });

    // authorization middleware - check if the user has the required role
    fastify.decorate('authorize', async (roles = []) => {
        return async (request, reply) => {
            try {
                await request.jwtVerify();

                // Role not required, just return
                if (roles.length === 0) return;
                
                const user = request.user;  // decoded JWT payload
                if (!roles.includes(user.role)) {
                    return reply.code(403).send({ error: 'Forbidden' });
                }

            } catch (err) {
                reply.code(401).send(err);
            }
        };
    });

    // Endpoint to verify that the JWT is correct 
    fastify.get('/protected', { preHandler: [fastify.authenticate] }, async (request, reply)=> {
        return { message: 'You are authenticated!', user: request.user };
    });
});