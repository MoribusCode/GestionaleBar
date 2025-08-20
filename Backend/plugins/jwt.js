const fp = require('fastify-plugin');
const jwt = require('@fastify/jwt'); 

module.exports = fp(async (fastify, opts) => {
    fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        sign: {
            expiresIn: '8h'
        }
    });

    // authorization middleware - check if the user has the required role
    fastify.decorate('authorize', async (roles = []) => {
        return async (request, reply) => {
            try { 
                const token = request.cookies.token;
                if (!token) {
                    return reply.code(401).send({ error: 'No token found' });
                }
                const user = await request.jwt.verify(token);
                request.user = user;  // decoded JWT payload

                if (roles.length > 0 && !roles.includes(user.role)) {
                    return reply.code(403).send({ error: 'Forbidden' });
                } 
            
            } catch (err) {
                reply.code(401).send(err);
            }
        };
    });
});