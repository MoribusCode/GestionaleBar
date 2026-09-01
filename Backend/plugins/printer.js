const fp = require('fastify-plugin'); 
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

module.exports = fp(async (fastify, opts) => {

    const stampaScontrino = async (orderData, ip) => {

        console.log (ip);
        
        // Inizializzo la stampante 
        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: ip || '/dev/usb/lp0',
            characterSet: 'PC858_EURO'
        });

        // Controllo se la stampante è pronta
        let isPrinterConnected = await printer.isPrinterConnected();
        if (!isPrinterConnected) {
            throw new Error("Stampante non connessa");
        }

        // Stampo lo scontrino
        printer.alignCenter();
        printer.println("Scontrino");
        printer.drawLine();
        printer.alignCenter();
        printer.println(`Ordine n. ${orderData.id}`);
        printer.alignCenter();
        printer.println(`BAR H`);
        printer.drawLine();

        const category = sortByCategory(orderData.items);
        console.log (category);

        for (const item of orderData.items) {
            printer.println(`${item.name} x${item.quantity} - ${item.price}€`);
        }
        printer.drawLine();
        printer.println(`Totale: ${orderData.totalPrice}€`);
        printer.cut();

        // Invio il comando di stampa alla stampante
        try {
            await printer.execute();
            console.log("Stampa completata con successo");
        } catch (error) {
            console.error("Errore durante la stampa:", error);
            throw new Error("Errore durante la stampa");
        }
    };

    function sortByCategory(items) {

        const groups = {};
        for (const item of items) {

            const key = item.category?.toLowerCase() || ''
            groups[key] ??= []
            groups[key].push(item)
        }
        return groups;
    }

    fastify.decorate('printer', { stampaScontrino });

});
