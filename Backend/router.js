module.exports = function (fastify, opts, done) {

    const db = require("./Database/database");

    const util = require("util");

    // Promisify DB methods
    const dbAll = util.promisify(db.all).bind(db);
    const dbRun = util.promisify(db.run).bind(db);
    const dbGet = util.promisify(db.get).bind(db);

    // GET all orders
    fastify.get("/orders", async (request, reply) => {
        try {
            const rows = await dbAll(`
            SELECT  
                o.order_id as id,
                o.status as status,
                o.total_price as totalPrice,
                json_group_array(
                    json_object(
                        'name', oi.item_name, 
                        'quantity', oi.quantity
                    )
                ) as items
            FROM orders o
            JOIN order_items oi
                ON oi.order_id = o.order_id
            GROUP BY oi.order_id
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

// GET all pending orders (solo quelli non ancora completati)
    fastify.get("/orders/pending", async (request, reply) => {
  try {
    const rows = await dbAll(`
      SELECT 
        o.order_id, 
        o.status,
        oi.item_name, 
        oi.quantity, 
        i.category
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN items i ON oi.item_name = i.name
      WHERE oi.status = 'pending'
    `);

    // Raggruppiamo per ordine
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.order_id]) {
        acc[row.order_id] = {
          id: row.order_id,
          status: row.status,
          items: []
        };
      }
      acc[row.order_id].items.push({
        name: row.item_name,
        quantity: row.quantity,
        category: row.category
      });
      return acc;
    }, {});

    return Object.values(grouped);
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
            const totalPrice = request.body.totalPrice || 0;
            await dbRun('INSERT INTO orders (total_price) VALUES (?)', totalPrice);

            const row = await dbGet("SELECT MAX(order_id) AS order_id FROM orders");
            const orderId = row.order_id; 

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


            return reply.status(201).send({ 
                id: orderId, 
                status: "pending", 
                items: request.body.order
            });

        } catch (err) {
            console.error("Errore durante l'inserimento dell'ordine:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // PUT (Mark order as completed)
    fastify.put("/orders/:orderId/category/:category/close", async (request, reply) => {
    const { orderId, category } = request.params;;
        
        try {
        console.log("ordine:",orderId,",",category)
        // Controllo quante righe "pending" ci sono nell'ordine
        const pendingRows = await dbAll(
        "SELECT * FROM order_items WHERE order_id = ? AND status = 'pending'",
        [orderId]
        );

 if (pendingRows.length === 0) {
        return reply.status(400).send({ message: "Non ci sono righe pending da chiudere" });
        }
        console.log(orderId, category)
        const categoryRows = await dbAll(
            `SELECT * 
            FROM order_items oi
            LEFT JOIN items i ON oi.item_name = i.name
            WHERE oi.order_id = ?
            AND oi.status = 'pending'
            AND lower(i.category) = lower(?)`,
            [orderId, category]
        );

        console.log(categoryRows.length,",",pendingRows.length)
        if (categoryRows.length === pendingRows.length) {
            console.log("ultima parte fatta, chiudo totalmente l'ordine")
            await dbRun(
                "UPDATE order_items SET status = 'closed' WHERE order_id = ?",
                [orderId]
            );
            await dbRun(
                "UPDATE orders SET status = 'closed' WHERE order_id = ?",
                [orderId]
            );
            return { orderId, status: "closed" };
        } else {
            console.log("riga completata, ordine in stato parziale")
            await dbRun(
            `UPDATE order_items
            SET status = 'partial'
            WHERE order_id = ? 
                AND item_name IN (SELECT name FROM items WHERE lower(category) = lower(?))`,
            [orderId, category]
            );

            // Aggiorna status ordine se non era già parziale
            const order = await dbGet("SELECT status FROM orders WHERE order_id = ?", [orderId]);
            if (order.status !== "partial") {
                await dbRun(
                "UPDATE orders SET status = 'partial' WHERE order_id = ?",
                [orderId]
                );
            }
            return { orderId, status: "partial", category };
        }
         } catch (err) {
        console.error("Errore chiusura ordine:", err.message);
        return reply.status(500).send({ message: err.message });
    }
    });

    done();
}