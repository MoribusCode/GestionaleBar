const fp = require('fastify-plugin');
const cookie = require('@fastify/cookie');

module.exports = fp(async (fastify, opts) => {
    fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET, // Use a secure secret for signing cookies
        parseOptions: {
            httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
            sameSite: 'strict', // Prevent CSRF attacks
            path: '/'
        }
    });
});