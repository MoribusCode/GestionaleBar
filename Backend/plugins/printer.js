const path = require("path");
const fp = require('fastify-plugin');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

module.exports = fp(async (fastify, opts) => {

    const stampaScontrino = async (orderData, ip) => {

        const printableWidth = 42;

        const normalizedIp = ip
            ? (ip.startsWith("tcp://") ? ip : `tcp://${ip}:9100`)
            : "/dev/usb/lp0";

        // Inizializzo la stampante
        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: normalizedIp,
            characterSet: 'PC858_EURO',
            width: printableWidth
        });


        // Controllo se la stampante è pronta
        let isPrinterConnected = await printer.isPrinterConnected();
        if (!isPrinterConnected) {
            throw new Error("Stampante non connessa");
        }

        // Cassetto aperto con un execute() a parte, PRIMA di comporre lo scontrino: così l'apertura
        // avviene davvero subito, invece che aspettare in coda dietro tutto il resto della stampa.
        if (orderData.paymentMethod == 'contanti') {
            printer.openCashDrawer();
            await printer.execute();
        }

        // Margine sinistro di 16 punti di stampa.
        await setLeftMargin(printer);

        // Il logo deve essere aggiunto prima di tutto il testo e del taglio.
        const logoPath = path.join(__dirname, "../assets/logoScontrino.png");
        printer.alignCenter();
        await printer.printImage(logoPath);
        printer.newLine();

        printer.println("DOCUMENTO NON FISCALE");
        printer.drawLine();
        printer.setTextSize(1, 1);
        printer.println(`Ordine n. ${orderData.order_number || orderData.orderNumber || orderData.id}`);
        printer.setTextNormal();
        printer.drawLine();

        for (const item of orderData.items) {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.price || 0);
            const lineTotal = quantity * unitPrice;
            const priceLabel = `${lineTotal.toFixed(2)} EUR`;
            const itemLabel = `${item.name} x${quantity}`.slice(
                0,
                printableWidth - priceLabel.length - 1
            );

            printer.leftRight(
                itemLabel,
                priceLabel
            );
        }

        printer.newLine();
        printer.drawLine();
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(`Totale: ${Number(orderData.totalPrice || 0).toFixed(2)} EUR`);
        printer.setTextNormal();
        printer.bold(false);
        printer.println(`Pagamento: ${formatPaymentMethod(orderData.paymentMethod)}`);

        if (orderData.note) {
            printer.println(`Nota: ${orderData.note}`);
        }

        printer.newLine();
        printer.alignCenter();
        printer.println("Grazie e arrivederci!");
        printer.partialCut();

        // alcuni bar vogliono solo lo scontrino, senza i tagliandini per le postazioni
        if (orderData.printTags !== false) {
            await printerTags(printer, orderData, printableWidth);
        }

        // Invio il comando di stampa alla stampante
        try {
            await printer.execute();
            console.log("Stampa completata con successo");
        } catch (error) {
            console.error("Errore durante la stampa:", error);
            throw new Error("Errore durante la stampa");
        }
    };

    // stampa un resoconto sintetico quando si chiude la giornata: ordini, incasso per
    // metodo di pagamento, articoli venduti, totale.
    // riepilogo: { dayLabel, orderCount, contanti, pos, altro, totale, items: [{name, quantity, totalPrice}] }
    const stampaResocontoChiusura = async (riepilogo, ip) => {
        const printableWidth = 42;

        const normalizedIp = ip
            ? (ip.startsWith("tcp://") ? ip : `tcp://${ip}:9100`)
            : "/dev/usb/lp0";

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: normalizedIp,
            characterSet: 'PC858_EURO',
            width: printableWidth
        });

        const isPrinterConnected = await printer.isPrinterConnected();
        if (!isPrinterConnected) {
            throw new Error("Stampante non connessa");
        }

        await setLeftMargin(printer);

        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("RESOCONTO DI CHIUSURA");
        printer.setTextNormal();
        printer.bold(false);
        printer.println(riepilogo.dayLabel);
        printer.drawLine();

        printer.alignLeft();
        printer.leftRight("Ordini chiusi", String(riepilogo.orderCount));
        printer.leftRight("Contanti", `${riepilogo.contanti.toFixed(2)} EUR`);
        printer.leftRight("POS", `${riepilogo.pos.toFixed(2)} EUR`);
        if (riepilogo.altro > 0) {
            printer.leftRight("Altro", `${riepilogo.altro.toFixed(2)} EUR`);
        }
        printer.drawLine();

        // solo gli articoli effettivamente venduti (quantità > 0), niente righe vuote per il resto del catalogo
        if (riepilogo.items && riepilogo.items.length > 0) {
            printer.bold(true);
            printer.println("ARTICOLI VENDUTI");
            printer.bold(false);
            for (const item of riepilogo.items) {
                const priceLabel = `${item.totalPrice.toFixed(2)} EUR`;
                const nameLabel = `${item.name} x${item.quantity}`.slice(0, printableWidth - priceLabel.length - 1);
                printer.leftRight(nameLabel, priceLabel);
            }
            printer.drawLine();
        }

        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(`TOTALE: ${riepilogo.totale.toFixed(2)} EUR`);
        printer.setTextNormal();
        printer.bold(false);

        printer.newLine();
        printer.partialCut();

        try {
            await printer.execute();
            console.log("Resoconto di chiusura stampato con successo");
        } catch (error) {
            console.error("Errore durante la stampa del resoconto:", error);
            throw new Error("Errore durante la stampa del resoconto");
        }
    };

    async function setLeftMargin(printer) {
        await printer.raw(Buffer.from([0x1d, 0x4c, 0x10, 0x00]));
    }

    function sortByCategory(items) {
        const groups = {};

        for (const item of items) {

            const key = item.category?.trim().toLowerCase() || "";
            groups[key] ??= [];
            groups[key].push(item);
        }

        return groups;
    }

    function formatPaymentMethod(paymentMethod) {
        const labels = {
            contanti: "Contanti",
            pos: "POS"
        };

        return labels[paymentMethod?.toLowerCase()] || paymentMethod || "Non specificato";
    }


    async function printerTags(printer, orderData, printableWidth) {
        const categories = sortByCategory(orderData.items);
        const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
        const categoryEntries = Object.entries(categories);
        const tagIndent = "    ";

        for (const [category, items] of categoryEntries) {
            const categoryLetter = items[0].prefix || category.charAt(0).toUpperCase() || "?";

            // Alcune stampanti ripristinano il margine dopo il taglio precedente.
            await setLeftMargin(printer);

            printer.newLine();
            printer.alignCenter();
            printer.println("TAGLIANDO POSTAZIONE");
            printer.println(category || "SENZA CATEGORIA");
            printer.setTextSize(1, 1);
            printer.println(`Ordine n. ${orderData.order_number || orderData.orderNumber || orderData.id}`);
            printer.setTextNormal();
            printer.println(timestamp);
            printer.drawLine();

            printer.setTextSize(1, 1);
            printer.alignLeft();
            for (const item of items) {
                const itemLabel = `${tagIndent}${item.name} x${Number(item.quantity || 0)}`
                    .slice(0, printableWidth - tagIndent.length);
                printer.println(itemLabel);
            }
            printer.setTextNormal();

            if (orderData.note) {
                printer.drawLine();
                printer.println(`${tagIndent}Nota: ${orderData.note}`);
            }

            printer.newLine();
            printer.alignCenter();
            printer.newLine();
            printer.bold(true);
            printer.setTextSize(4, 4);
            printer.println(`${categoryLetter}${orderData.order_number || orderData.orderNumber || orderData.id}`);
            printer.setTextNormal();
            printer.bold(false);
            printer.partialCut();
        }
    }

    fastify.decorate('printer', { stampaScontrino, stampaResocontoChiusura });

});
