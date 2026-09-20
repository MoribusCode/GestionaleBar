const jwt = require('@fastify/jwt');
const fp = require('fastify-plugin');

const TOKEN_LIFETIME = '8h';
// se al token manca meno di questa soglia alla scadenza, una richiesta autenticata lo rinnova
// in automatico (a scorrimento): così una cassa usata di continuo non scade mai a metà turno,
// ma un token davvero abbandonato (nessuna richiesta per 8h) scade comunque come previsto
const REFRESH_THRESHOLD_SECONDS = 60 * 60; // rinnova se manca meno di 1h

const COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict'
};

module.exports = fp(async (fastify, opts) => {

    fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        sign: {
            expiresIn: TOKEN_LIFETIME
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

            const secondsLeft = user.exp - Math.floor(Date.now() / 1000);
            if (secondsLeft < REFRESH_THRESHOLD_SECONDS) {
                const freshToken = await fastify.jwt.sign({
                    username: user.username,
                    role: user.role,
                    bar_id: user.bar_id,
                    categories: user.categories
                });
                const { exp } = fastify.jwt.decode(freshToken);

                reply.setCookie('token', freshToken, COOKIE_OPTIONS);
                request.user.exp = exp; // così /check e la risposta qui sotto vedono già la nuova scadenza
            }

           
            reply.header('X-Session-Expires-At', String(user.exp * 1000));
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