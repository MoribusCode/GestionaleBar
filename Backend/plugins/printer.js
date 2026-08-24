const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

module.exports = fp (async (fastify, opts) => {

    // Inizializzo la stampante 
    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,  
        interface: process.env.PRINTER_INTERFACE || '/dev/usb/lp0',
        characterSet: 'PC858_EURO'
    });

    const stampaScontrino = async (datiOrdine) => {

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
        printer.println (`Ordine n. ${datiOrdine.orderID}`);
        printer.alignCenter();
        printer.println (`BAR H`);
        printer.drawLine();
        for (const item of datiOrdine.items) {
            printer.println(`${item.name} x${item.quantity} - ${item.price}€`);
        }
        printer.drawLine();
        printer.println(`Totale: ${datiOrdine.total}€`);
        printer.cut();

        // Invio il comando di stampa alla stampante
        try {
            await printer.execute();
            console.log("Stampa completata con successo");
        } catch (error) {
            console.error("Errore durante la stampa:", error);
            throw new Error("Errore durante la stampa");
        }
    }

});
