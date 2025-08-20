const fp = require('fastify-plugin');
const bcrypt = require('bcrypt');
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

            if (!user) {
                return reply.status(401).send({ message: "Invalid credentials" });
            }

            const match = await bcrypt.compare(password, user.password);

            if (match) {
                const token = fastify.jwt.sign({
                    username: user.username,
                    role: user.role
                }, {
                    expiresIn: '8h'
                });

                return reply.send({ token });
            } else {
                return reply.status(401).send({ message: "Invalid credentials" });
            }
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
        return dbGet("SELECT * FROM users WHERE username = ?",
            [username]
        );
    }
});