const api = require("./router");

require("dotenv").config();

const fastify = require("fastify") ({ logger: true });
const cors = require("@fastify/cors");

// Enable CORS (so the frontend can communicate with the backend)
fastify.register (cors, {
  origin: true,
});

// Register the API routes
fastify.register (api, {prefix: "/api"});

// Start the server
const PORT = process.env.PORT || 3000;

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});
