const fp = require('fastify-plugin');
const bcrypt = require('bcrypt');
const cookie = require('../plugins/cookie');

const { dbRun, dbGet } = require('../Database/database');

module.exports = fp(async (fastify, opts) => {

    // Login endpoint
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            return reply.status(400).send({ message: "Username and password are required" });
        }

        try {
            const user = await getUser(username);
            const match = await bcrypt.compare(password, user.password);

            if (!user || !match) {
                return reply.status(401).send({ message: "Invalid credentials" });
            }

            const token = fastify.jwt.sign({
                username: user.username,
                role: user.role
            });

            reply.setCookie('token', token);

            return reply.send({
                message: "Login successful",
                user: {
                    username: user.username,
                    role: user.role
                }
            });

        } catch (err) {
            return reply.status(500).send({ message: "Internal server error" });
        }
    });

    fastify.post('/register', async (request, reply) => {
        const { username, password, role } = request.body;

        if (!username || !password || !role) {
            return reply.status(400).send({ message: "Missing fields" });
        }

        try {
            // Check if user already exists
            const existingUser = await getUser(username);
            if (existingUser) {
                return reply.status(409).send({ message: "User already exists" })
            }

            // Hash the password
            const saltRounds = 10;
            const hashed = await bcrypt.hash(password, saltRounds);

            await dbRun(`
                INSERT INTO users (username, password, role)
                VALUES (?, ?, ?)`,
                [username, hashed, role]
            );

        } catch (err) {
            return reply.status(500).send({ message: "Internal server error" });
        }
    });


    async function getUser(username) {
        try {
            return dbGet("SELECT * FROM users WHERE username = ?",
                [username]
            );
        } catch (err) {
            console.error("Error fetching user:", err.message);
            throw err;
        }
    }
});