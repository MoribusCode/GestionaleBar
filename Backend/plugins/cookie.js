const cookie = require('@fastify/cookie');
const fp = require('fastify-plugin');

module.exports = fp (async (fastify, opts) => {

    fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET, // Use a secure secret for signing cookies
        hook: 'onRequest',
        parseOptions: {},
        cookieOptions: {
            httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
            secure: false,
            sameSite: 'strict', // Prevent CSRF attacks
            path: '/',
            signed: false
        }
    });
});