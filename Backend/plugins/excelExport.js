const fp = require('fastify-plugin');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

module.exports = fp(async (fastify, opts) => {

    function getFileTimestamp(date = new Date()) {
        const anno = date.getFullYear();
        const mese = String(date.getMonth() + 1).padStart(2, "0");
        const giorno = String(date.getDate()).padStart(2, "0");
        const ore = String(date.getHours()).padStart(2, "0");
        const minuti = String(date.getMinutes()).padStart(2, "0");

        return `${anno}-${mese}-${giorno}_${ore}-${minuti}`;
    }


    function exportOrders(orders, label = '') {
        const dayLabel = new Date().toLocaleDateString('it-IT');

        const mappedOrders = orders.map(order => ({
            ID: order.id,
            Totale: order.totalPrice,
            Articoli: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
            Data: dayLabel
        }));

        const total = orders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);

        mappedOrders.push({});
        mappedOrders.push({ ID: 'Totale giornata', Totale: total, Articoli: '', Data: '' });

        const worksheet = XLSX.utils.json_to_sheet(mappedOrders);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

        // seconda pagina: quantità e subtotale di costo per articolo, sommati su tutti gli ordini
        const itemTotals = {};
        for (const order of orders) {
            for (const item of order.items) {
                if (!itemTotals[item.name]) itemTotals[item.name] = { quantity: 0, subtotal: 0 };
                itemTotals[item.name].quantity += item.quantity;
                itemTotals[item.name].subtotal += item.quantity * (Number(item.price) || 0);
            }
        }
        const mappedItemTotals = Object.entries(itemTotals).map(([name, t]) => ({
            Articolo: name,
            Quantità: t.quantity,
            Subtotale: t.subtotal
        }));
        const itemTotalsSheet = XLSX.utils.json_to_sheet(mappedItemTotals);
        XLSX.utils.book_append_sheet(workbook, itemTotalsSheet, "OrderTotal");

        const suffix = label ? `_${label}` : '';
        const fileName = `orders${suffix}_${getFileTimestamp()}.xlsx`;

        const exportsDir = process.env.EXPORT_PATH || './exports';
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }
        const filePath = path.join(exportsDir, fileName);
        XLSX.writeFile(workbook, filePath);

        const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const receiptData = `data:${XLSX_MIME_TYPE};base64,${base64}`;

        return { fileName, filePath, total, receiptData, mimeType: XLSX_MIME_TYPE };
    }

    fastify.decorate('excelExport', { exportOrders });

});
