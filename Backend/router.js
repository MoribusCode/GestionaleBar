module.exports = function (fastify, opts, done) {

    // In-memory orders list (Replace with a database later)
    let orders = [];

    // Get all orders
    fastify.get("/orders", async (request, reply) => {
        return orders;
    });

    // Create a new order
    fastify.post("/orders", async (request, reply) => {

        if (!request.body.order || !Array.isArray(request.body.order) || request.body.order.length === 0) {
            return reply.status(400).send({ message: "Name and items are required" });
        }

        const order = { ...request.body, status: "pending"};
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

    done();
}
