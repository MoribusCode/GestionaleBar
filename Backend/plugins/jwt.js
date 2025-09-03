const jwt = require('@fastify/jwt');
const fp = require('fastify-plugin'); 

module.exports = fp(async (fastify, opts) => {

    fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        sign: {
            expiresIn: '8h'
        },
        cookie: {
            cookieName: 'token',
            signed: false
        }
    });

    fastify.addHook('onRequest', async (request, reply) => {
        try {
            const user = await request.jwtVerify();
            request.user = user;  // decoded JWT payload
        } catch (err) {
            console.error("JWT verification error:", err.message);
        }
    });

    // authorization middleware - check if the user has the required role
    fastify.decorate('authorize', (roles = []) => {
        return async (request, reply) => {
            try { 
                if (!request.user) {
                    return reply.code(401).send({ error: 'No token found' });
                }

                if (roles.length > 0 && !roles.includes(request.user.role)) {
                    return reply.code(403).send({ error: 'Forbidden' });
                } 
            
            } catch (err) {
                reply.code(401).send(err);
            }
        };
    });
});