require("dotenv").config();

const fastify = require("fastify") ({ logger: true });
const cors = require("@fastify/cors");
const { Server } = require("socket.io");  // socket.io server class

// Enable CORS (so the frontend can communicate with the backend)
fastify.register (cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // Allow cookies to be sent with requests
});

// Register cookie plugin 
fastify.register(require("./plugins/cookie"));

// Register JWT plugin
fastify.register(require("./plugins/jwt"));

// Register routes 
fastify.register(require("./routes/admin"), {prefix: "/admin"});
fastify.register(require ("./routes/auth"), {prefix: "/auth"});

// Register the API routes
fastify.register(require ("./router"), {prefix: "/api"});

// Avvio manuale del server HTTP per poterlo usare con socket.io
const start = async () => {
  try {
    await fastify.listen({ 
      port: process.env.PORT || 3000, 
      host: process.env.HOST || "0.0.0.0" 
    });

    const address = fastify.server.address();
    console.log(`Server running at ${address.address}:${address.port}`);

    // Attacco socket.io al server HTTP interno di Fastify
    const io = new Server(fastify.server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true, // Allow cookies to be sent with requests
        transports: ['websocket', 'polling']
      }
    });

    // Salvo l'istanza socket.io dentro fastify per poterla usare in router.js (Così si possono chiamare i vari eventi)
    fastify.io = io;

    io.on("connection", (socket) => {
      console.log("Nuovo client connesso", socket.id);

      socket.on("disconnect", () => {
        console.log("Client disconnesso", socket.id);
      });
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
