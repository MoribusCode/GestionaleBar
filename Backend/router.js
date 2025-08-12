const { stat } = require("fs");

module.exports = function (fastify, opts, done) {

    const db = require("./Database/database");

    const util = require("util");

    // Promisify DB methods
    const dbAll = util.promisify(db.all).bind(db);
    const dbRun = util.promisify(db.run).bind(db);

    // GET all orders
    fastify.get("/orders", async (request, reply) => {
        try {
            const rows = await dbAll(`
            SELECT  
                oi.order_id as id,
                oi.status as status,
                oi.total_price as totalPrice,
                json_group_array(
                    json_object(
                        'name', oi.item_name, 
                        'quantity', oi.quantity
                    )
                ) as items
            FROM order_items oi
            GROUP BY order_id
            `);

        const orders = rows.map(row => ({
            ...row,
            items: JSON.parse(row.items) // Convert JSON string (items) to object
        }));
        
        return orders;

        } catch (err) {

            return reply.status(500).send({ message: err.message });
        }
    });

    // GET all items (retrieve catalog)
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
            return reply.status(400).send({ message: "Payload not correct" });
        }

        try {
            const orderId = await getID();
            const totalPrice = request.body.totalPrice || 0;

            const insertItem = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, total_price) VALUES (?, ?, ?, ?)');
            
            // Promisify stmt.run
            const stmtRun = util.promisify(insertItem.run).bind(insertItem);

            for (const item of request.body.order) {
                await stmtRun(orderId, item.name, item.quantity, totalPrice);
            }

            insertItem.finalize(); // Clean up statement

            return reply.status(201).send({ 
                id: orderId, 
                items: request.body.order,
                status: "pending",
                totalPrice: totalPrice
            });

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

        const rows = await dbGet('SELECT MAX(order_id) AS maxId FROM order_items');
    
        // Return max ID + 1 or 1 if no orders exist
        return rows.maxId ? rows.maxId + 1 : 1;
    }

    done();
}