require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");

// Enable CORS (so the frontend can communicate with the backend)
fastify.register(cors);

// In-memory orders list (Replace with a database later)
let orders = [];

// Get all orders
fastify.get("/orders", async (request, reply) => {
  return orders;
});

// Create a new order
fastify.post("/orders", async (request, reply) => {
  const { name, items } = request.body;
  if (!name || !items) {
    return reply.status(400).send({ message: "Name and items are required" });
  }

  const order = { id: orders.length + 1, name, items, status: "pending" };
  orders.push(order);
  return reply.status(201).send(order);
});

// Mark order as completed
fastify.put("/orders/:id", async (request, reply) => {
  const { id } = request.params;
  const order = orders.find((o) => o.id == id);
  if (!order) {
    return reply.status(404).send({ message: "Order not found" });
  }

  order.status = "completed";
  return reply.send(order);
});

// Start the server
const PORT = process.env.PORT || 5000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});
