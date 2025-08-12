module.exports = function (fastify, opts, done) {

    const db = require("./Database/database");

    const util = require("util");

    // Promisify DB methods
    const dbAll = util.promisify(db.all).bind(db);
    const dbRun = util.promisify(db.run).bind(db);

    // Get all orders
    fastify.get("/orders", async (request, reply) => {
        try {
            const rows = await dbAll(`
            SELECT orders.id, orders.status,
            group_concat(order_items.item_name || ' x' || order_items.quantity, ', ') as items
            FROM orders
            LEFT JOIN order_items ON orders.id = order_items.order_id
            GROUP BY orders.id
            `);

            return rows; // Fastify will send this as JSON

        } catch (err) {

            return reply.status(500).send({ message: err.message });
        }
    });

    // GET all items
    fastify.get("/items", async (request, reply) => {
        try {
            const rows = await dbAll("SELECT * FROM items");
            return rows;
        } catch (err) {

            console.error("Errore durante il recupero degli articoli:", err.message);
            return reply.status(500).send({ error: "Errore nel database" });
        }
    });

    // POST a new order
    fastify.post("/orders", async (request, reply) => {

        if (!request.body.order || !Array.isArray(request.body.order) || request.body.order.length === 0) {
            return reply.status(400).send({ message: "Name and items are required" });
        }

        try {
            const orderId = await getID();

            const insertItem = db.prepare('INSERT INTO order_items (order_id, item_name, quantity) VALUES (?, ?, ?)');
            
            // Promisify stmt.run
            const stmtRun = util.promisify(insertItem.run).bind(insertItem);

            for (const item of request.body.order) {
                await stmtRun(orderId, item.name, item.quantity);
            }

            insertItem.finalize(); // Clean up statement

            // Alla fine di TUTTO, emetto evento websocket con ordine
            const orderData = {
            id: orderId,
            items: request.body.order
            };
            fastify.io.emit('new-order', orderData);  // fastify.io è il websocket server (socket.io)


            return reply.status(201).send({ id: orderId, status: "pending", items: request.body.order});

        } catch (err) {
            console.error("Errore durante l'inserimento dell'ordine:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // PUT (Mark order as completed)
    fastify.put("/orders/:id", async (request, reply) => {

        const { id } = request.params;
        
        try {
            const result = await dbRun(`UPDATE orders SET status = 'completed' WHERE id = ?`, [id]);
            if (result.changes === 0) {
                return reply.status(404).send({ message: "Order not found" });
            }

            return { id, status: "completed" };

        } catch (err) {
            return reply.status(500).send({ message: err.message });
        }
    });

    async function getID() {
        const dbGet = util.promisify(db.get).bind(db);

        let rows = await dbGet('SELECT MAX(order_id) AS maxId FROM order_items');
    
        // Return max ID + 1 or 1 if no orders exist
        return rows.maxId ? rows.maxId + 1 : 1;
    }

    done();
}