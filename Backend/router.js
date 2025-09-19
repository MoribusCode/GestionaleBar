module.exports = function (fastify, opts, done) {

    const db = require("./Database/database");

    const util = require("util");
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');

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
                o.note,
                oi.item_name, 
                oi.quantity, 
                i.category
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN items i ON oi.item_name = i.name
            WHERE oi.status = 'in attesa'
            `);

            // Raggruppiamo per ordine
            const grouped = rows.reduce((acc, row) => {
                if (!acc[row.order_id]) {
                    acc[row.order_id] = {
                        id: row.order_id,
                        status: row.status,
                        note: row.note || '',
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
            const items = await dbAll("SELECT * FROM items");
            return { items };
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
            const note = request.body.note || '';
            await dbRun('INSERT INTO orders (total_price,note) VALUES (?,?)', [totalPrice, note]);

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
                items: request.body.order,
                note
            };

            fastify.io.emit('new-order', orderData);  // fastify.io è il websocket server (socket.io)

            return reply.status(201).send({
                id: orderId,
                status: "pending",
                items: request.body.order,
                note
            });

        } catch (err) {
            console.error("Errore durante l'inserimento dell'ordine:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // DELETE an order by ID
    fastify.delete("/delete-order/:id", async (request, reply) => {
        const { id } = request.params;

        try {
            // Prima elimino le righe associate in order_items
            await dbRun("DELETE FROM order_items WHERE order_id = ?", [id]);

            // Poi elimino l'ordine stesso
            const result = await dbRun("DELETE FROM orders WHERE order_id = ?", [id]);

            return reply.send({ message: "Ordine eliminato con successo", id });
        } catch (err) {
            console.error("Errore durante l'eliminazione dell'ordine:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // PUT (Mark order as completed)
    fastify.put("/orders/:orderId/category/:category/close", async (request, reply) => {
        const { orderId, category } = request.params;

        try {
            console.log("ordine:", orderId, ",", category)
            // Controllo quante righe "in attesa" ci sono nell'ordine
            const pendingRows = await dbAll(
                "SELECT * FROM order_items WHERE order_id = ? AND status = 'in attesa'",
                [orderId]
            );

            if (pendingRows.length === 0) {
                return reply.status(400).send({ message: "Non ci sono righe in attesa da chiudere" });
            }
            console.log(orderId, category)
            const categoryRows = await dbAll(
                `SELECT * 
                    FROM order_items oi
                    LEFT JOIN items i ON oi.item_name = i.name
                    WHERE oi.order_id = ?
                    AND oi.status = 'in attesa'
                    AND lower(i.category) = lower(?)`,
                [orderId, category]
            );

            console.log(categoryRows.length, ",", pendingRows.length)
            if (categoryRows.length === pendingRows.length) {
                console.log("ultima parte fatta, chiudo totalmente l'ordine")
                await dbRun(
                    "UPDATE order_items SET status = 'completato' WHERE order_id = ?",
                    [orderId]
                );
                await dbRun(
                    "UPDATE orders SET status = 'completato' WHERE order_id = ?",
                    [orderId]
                );
                return { orderId, status: "completato" };
            } else {
                console.log("riga completata, ordine in stato parziale")
                await dbRun(
                    `UPDATE order_items
                    SET status = 'parziale'
                    WHERE order_id = ? 
                    AND item_name IN (SELECT name FROM items WHERE lower(category) = lower(?))`,
                    [orderId, category]
                );

                // Aggiorna status ordine se non era già parziale
                const order = await dbGet("SELECT status FROM orders WHERE order_id = ?", [orderId]);
                if (order.status !== "parziale") {
                    await dbRun(
                        "UPDATE orders SET status = 'parziale' WHERE order_id = ?",
                        [orderId]
                    );
                }
                return { orderId, status: "parziale", category };
            }
        } catch (err) {
            console.error("Errore chiusura ordine:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });

    // POST - Chiudi giornata (svuota ordini e order_items)
    fastify.post("/orders/close-day", async (request, reply) => {
        try {
            // Prima svuoto order_items
            await dbRun("DELETE FROM order_items");

            // Poi svuoto orders
            await dbRun("DELETE FROM orders");

            // Resetto i contatori di riga
            await dbRun("DELETE FROM sqlite_sequence WHERE name in ('orders','order_items')");

            return reply.send({ message: "Giornata chiusa con successo. Tutti gli ordini sono stati cancellati." });
        } catch (err) {
            console.error("Errore durante la chiusura della giornata:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });


    fastify.post("/export-excel", async (request, reply) => {
        try {
            const { orders } = request.body;

            if (!orders || !Array.isArray(orders)) {
                return reply.status(400).send({ message: "Orders data is required" });
            }

            const mappedOrders = orders.map(order => ({
                ID: order.id,
                Totale: order.totalPrice,
                Articoli: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
                Data: new Date().toLocaleDateString('it-IT')
            }));

            const totalSum = orders.reduce((sum, order) => sum + order.totalPrice, 0);

            // Add empty row and total
            mappedOrders.push({});
            mappedOrders.push({
                ID: 'Totale giornata',
                TotalPrice: totalSum + "€",
                Articoli: '',
                Data: ''
            });

            const worksheet = XLSX.utils.json_to_sheet(mappedOrders);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

            // Create exports directory if it doesn't exist
            const exportsDir = process.env.EXPORT_PATH || './exports';
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir);
            }

            // Save file on server
            const fileName = `orders_${getFileTimestamp}.xlsx`;
            const filePath = path.join(exportsDir, fileName);

            XLSX.writeFile(workbook, filePath);

            return reply.send({
                success: true,
                message: 'Excel file saved successfully on server',
                fileName: fileName,
                filePath: filePath
            });
        } catch (error) {
            console.error('Error saving Excel file:', error);
            return reply.status(500).send({
                success: false,
                message: 'Error saving Excel file',
                error: error.message
            });
        }
    });

    // funzione ausiliaria per calcolare il timestamp

    function getFileTimestamp(date = new Date()) {
        const anno = date.getFullYear();
        const mese = String(date.getMonth() + 1).padStart(2, "0"); // mesi 0-11
        const giorno = String(date.getDate()).padStart(2, "0");
        const ore = String(date.getHours()).padStart(2, "0");
        const minuti = String(date.getMinutes()).padStart(2, "0");

        // Formato: YYYY-MM-DD_HH-MM
        return `${ anno }-${ mese }-${ giorno }-${ ore }-${ minuti }`;
    }

    done();
}