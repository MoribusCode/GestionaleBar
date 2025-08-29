const db = require('../Database/database');
const bcrypt = require('bcrypt');
const { timeStamp } = require('console');
const util = require('util');

const dbRun = util.promisify(db.run).bind(db);
const dbGet = util.promisify(db.get).bind(db);

// Add this function to create admin user
async function createAdminUser() {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminRole = 'admin';
    
    try {
        // Check if admin already exists
        const existingAdmin = await dbGet("SELECT * FROM users WHERE username = ?", 
            [adminUsername]
        );

        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Hash the admin password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

        // Insert admin user
        await dbRun(`
            INSERT INTO users (username, password, role)
            VALUES (?, ?, ?)`,
            [adminUsername, hashedPassword, adminRole]
        );
        
        console.log('Admin user created successfully');
    } catch (err) {
        console.error('Error creating admin user:', err.message);
    }
}

module.exports = function (fastify, opts, done) {
    // Create the admin user when the server starts
    createAdminUser();

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

            const token = await fastify.jwt.sign({
                username: user.username,
                role: user.role
            });

            reply.setCookie('token', token, {
                path: '/',
                httpOnly: true,
                secure: false,
                sameSite: 'Strict'
            });

            return reply.send({
                message: "Login successful",
                user: {
                    username: user.username,
                    role: user.role
                }
            });

        } catch (err) {
            console.error("Login error:", err.message);
            return reply.status(500).send({ message: "Internal server error" });
        }
    });

    // Register endpoint
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

    // Check endpoint
    fastify.get('/check', async (request, reply) => {
        try {
            
            if (request.user) {
                return reply.send({
                    authenticated: true,
                    user: request.user
                });
            }

        } catch (err) {
            console.error("Check error:", err.message);
            return reply.status(401).send({ authenticated: false });
        }
    });

    async function getUser(username) {
        try {
            const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);

            if (!user) {
                console.log("No user found with username:", username);
                return null;
            }
            return user;

        } catch (err) {
            console.error("Database error in getUser:", err);
            throw err;
        }
    }

    // Logout endpoint
    fastify.post('/logout', async (request, reply) => {
        try {
            // clear the session cookie
            reply.clearCookie('token', {
                path: '/',
                httpOnly: true,
                sameSite: 'Strict',
                secure: false
            });
            
            return reply.status(200).send({
                message: "Logout successful",
                timeStamp: new Date().getTime()
            });

        } catch (err) {
            console.error("Logout error:", err.message);
            return reply.status(500).send({ message: "Internal server error" });
        }
    });

    done();
};