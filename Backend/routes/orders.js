const { timeStamp } = require("console");

module.exports = function (fastify, opts, done) {

    const db = require("../Database/database");

    const util = require("util");

    // Promisify DB methods
    const dbAll = util.promisify(db.all).bind(db);
    const dbRun = util.promisify(db.run).bind(db);
    const dbGet = util.promisify(db.get).bind(db);

    function dbRunWithResult(sql, params) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    // GET all orders
    fastify.get("/orders", async (request, reply) => {
        try {
            // admin: vede tutti i bar di default, oppure filtra per uno specifico bar_id in query;
            // gli altri ruoli vedono sempre e solo il proprio bar.
            const isAdmin = request.user.role === 'admin';
            const barId = isAdmin ? (request.query.bar_id || null) : request.user.bar_id;

            const whereClause = barId ? 'WHERE o.bar_id = ?' : '';
            const params = barId ? [barId] : [];

            const rows = await dbAll(`
            SELECT
                o.order_id as id,
                o.bar_id as barId,
                o.status as status,
                o.total_price as totalPrice,
                o.created_at as createdAt,
                json_group_array(
                    json_object(
                        'name', oi.item_name,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'status', oi.status
                    )
                ) as items
            FROM orders o
            JOIN order_items oi
                ON oi.order_id = o.order_id
            ${whereClause}
            GROUP BY oi.order_id
            `, params);

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
            const barId = request.user.bar_id;
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
            WHERE oi.status = 'in attesa' AND o.bar_id = ?
            `, [barId]);

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

    // POST a new order
    fastify.post("/orders", async (request, reply) => {

        if (!request.body.order || !Array.isArray(request.body.order) || request.body.order.length === 0) {
            return reply.status(400).send({ message: "Payload not correct" });
        }

        try {
            const totalPrice = request.body.totalPrice || 0;
            const note = request.body.note || '';
            const barId = request.user.bar_id;
            const paymentMethod = request.body.paymentMethod || null;

            const updateBar = await dbGet(`
                UPDATE bar
                SET order_number = order_number + 1
                WHERE id = ?
                RETURNING order_number, printer_ip
            `, [barId]);

            const order_number = updateBar.order_number;
            const printer_ip = updateBar.printer_ip;

            const orderResult = await dbRunWithResult('INSERT INTO orders (total_price, note, bar_id, order_number, payment_method) VALUES (?, ?, ?, ?, ?)',
                [totalPrice, note, barId, order_number, paymentMethod]
            );
            const orderId = orderResult.lastID;

            const insertItem = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)');

            // Promisify stmt.run
            const stmtRun = util.promisify(insertItem.run).bind(insertItem);

            for (const item of request.body.order) {
                await stmtRun(orderId, item.name, item.quantity, Number(item.price || 0));
            }

            insertItem.finalize(); // Clean up statement

            // creo oggetto con i dati dell'ordine e i campi degli item che vengono inviati, mappati per lo scontrino
            const orderData = {
                id: orderId,
                order_number: order_number,
                items: request.body.order.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: Number(item.price || 0),
                    category: item.category
                })),
                note: note,
                totalPrice: totalPrice
            };

            try {
                await fastify.printer.stampaScontrino(orderData, printer_ip);
            } catch (err) {
                console.error("Errore durante la stampa dello scontrino:", err.message);
            }

            fastify.io.to(`bar-${barId}`).emit('new-order', orderData);

            return reply.status(201).send({
                id: orderId,
                status: "pending",
                items: request.body.order,
                note: note,
                paymentMethod: paymentMethod
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

    // POST - Chiudi giornata: chiude TUTTI i bar, creando per ciascuno una transazione
    // e un file Excel separato con i suoi ordini, poi svuota ordini e order_items.
    fastify.post("/orders/close-day", async (request, reply) => {
        try {
            const rows = await dbAll(`
            SELECT
                o.order_id as id,
                o.bar_id as barId,
                o.total_price as totalPrice,
                json_group_array(
                  json_object(
                    'name',
                    oi.item_name,
                    'quantity',
                    oi.quantity,
                    'price',
                    oi.price
                )
                ) as items
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            GROUP BY o.order_id
            `);

            const ordersByBar = {};

            for (const row of rows) {
                if (!ordersByBar[row.barId]) ordersByBar[row.barId] = {};
                ordersByBar[row.barId][row.id] = {
                    id: row.id,
                    totalPrice: row.totalPrice,
                    items: JSON.parse(row.items)
                };
            }

            const dayLabel = new Date().toLocaleDateString('it-IT');
            const closedBars = [];

            for (const barId in ordersByBar) {
                const barOrders = [];
                for (const orderId in ordersByBar[barId]) {
                    barOrders.push(ordersByBar[barId][orderId]);
                }

                const { fileName, total: barTotal, receiptData, mimeType } = fastify.excelExport.exportOrders(barOrders, `bar${barId}`);

                if (barTotal > 0) {
                    await dbRun(
                        `INSERT INTO transactions (amount, type, description, receipt_name, receipt_mime_type, receipt_data)
                         VALUES (?, 'IN', ?, ?, ?, ?)`,
                        [barTotal, `Chiusura giornata Bar #${barId} ${dayLabel}`, fileName, mimeType, receiptData]
                    );
                }

                closedBars.push({ barId: Number(barId) || null, total: barTotal, fileName, orderCount: barOrders.length });
            }

            if (closedBars.length > 0 && fastify.io) {
                fastify.io.emit('transaction-updated');
            }

            // Svuoto ordini e order_items di TUTTI i bar
            await dbRun("DELETE FROM order_items");
            await dbRun("DELETE FROM orders");

            // Resetto i contatori di riga
            await dbRun("DELETE FROM sqlite_sequence WHERE name in ('orders','order_items')");

            return reply.send({
                message: "Giornata chiusa con successo per tutti i bar.",
                bars: closedBars
            });
        } catch (err) {
            console.error("Errore durante la chiusura della giornata:", err.message);
            return reply.status(500).send({ message: err.message });
        }
    });


    // POST - esporta in excel tutte le comande
    fastify.post("/export-excel", async (request, reply) => {
        try {
            const { orders } = request.body;

            if (!orders || !Array.isArray(orders)) {
                return reply.status(400).send({ message: "Orders data is required" });
            }

            const { fileName, filePath } = fastify.excelExport.exportOrders(orders);

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

    done();
}