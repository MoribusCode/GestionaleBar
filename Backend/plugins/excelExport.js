const fp = require('fastify-plugin');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// stili del registro vendite, condivisi tra tutte le chiamate a exportVenditeBar
const FMT_EURO_RIGA = '_-"€"\\ * #,##0.00_-;\\-"€"\\ * #,##0.00_-;_-"€"\\ * "-"??_-;_-@_-';
const FMT_EURO_TOTALE = '_-* #,##0.00\\ "€"_-;\\-* #,##0.00\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-';

const BORDER_THIN_BLU = { style: 'thin', color: { argb: 'FF8FAADC' } };
const NERO_THIN = { style: 'thin', color: { argb: 'FF000000' } };
const NERO_MEDIO = { style: 'medium', color: { argb: 'FF000000' } };

const FILL_GRIGIO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
const FILL_VERDE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
const FILL_EVIDENZIA = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

function setBordo(cell) {
    cell.border = { top: BORDER_THIN_BLU, bottom: BORDER_THIN_BLU, left: BORDER_THIN_BLU, right: BORDER_THIN_BLU };
}

function getFileTimestamp(date = new Date()) {
    const anno = date.getFullYear();
    const mese = String(date.getMonth() + 1).padStart(2, "0");
    const giorno = String(date.getDate()).padStart(2, "0");
    const ore = String(date.getHours()).padStart(2, "0");
    const minuti = String(date.getMinutes()).padStart(2, "0");

    return `${anno}-${mese}-${giorno}_${ore}-${minuti}`;
}

async function writeExportFile(fileName, buildBuffer) {
    const exportsDir = process.env.EXPORT_PATH || './exports';
    if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir);
    }
    const filePath = path.join(exportsDir, fileName);
    const buffer = await buildBuffer();
    fs.writeFileSync(filePath, buffer);
    const receiptData = `data:${XLSX_MIME_TYPE};base64,${Buffer.from(buffer).toString('base64')}`;
    return { filePath, receiptData };
}

module.exports = fp(async (fastify, opts) => {

    async function exportOrders(orders, label = '') {
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
        const { filePath, receiptData } = await writeExportFile(fileName, () => XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));

        return { fileName, filePath, total, receiptData, mimeType: XLSX_MIME_TYPE };
    }

    // Registro vendite per tipo di prodotto (colonne = prodotti, 2 righe: quantità + importo),
    // per un singolo giorno di chiusura.
    //   prodotti: [{ nome, prezzo }]  elenco colonne, in ordine
    //   quantita: { nomeProdotto: pezziVenduti }
    //   data: Date del giorno a cui si riferisce la chiusura
    async function exportVenditeBar(prodotti, quantita, data, label = '') {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Vendite Bar');

        const N_PROD = prodotti.length;
        const COL_DATA = 1;
        const COL_PROD_START = 2;
        const COL_PROD_END = COL_PROD_START + N_PROD - 1;
        const COL_TOT_GIORNO = COL_PROD_END + 1;
        const COL_TOT_GENERALE = COL_TOT_GIORNO + 1;

        // lettera di colonna calcolata una sola volta per prodotto, riusata in tutte le righe
        const colLetters = prodotti.map((_, i) => ws.getColumn(COL_PROD_START + i).letter);

        // venerdì/sabato/domenica evidenziati in azzurrino, come nel registro originale
        const giornoSettimana = data.getDay(); // 0 = domenica ... 6 = sabato
        const evidenzia = giornoSettimana === 0 || giornoSettimana === 5 || giornoSettimana === 6;

        const gg = String(data.getDate()).padStart(2, '0');
        const mm = String(data.getMonth() + 1).padStart(2, '0');
        const yyyy = data.getFullYear();
        const etichetta = `${data.toLocaleDateString('it-IT', { weekday: 'long' })}\n${gg}/${mm}/${yyyy}`;

        // ---- Riga 1: intestazioni (Data + prodotti), ruotate 45° ----
        const cellData1 = ws.getCell(1, COL_DATA);
        cellData1.value = 'Data';
        cellData1.alignment = { textRotation: 45, horizontal: 'left' };
        cellData1.font = { name: 'Calibri', size: 11, italic: true };
        setBordo(cellData1);

        prodotti.forEach((p, i) => {
            const cell = ws.getCell(1, COL_PROD_START + i);
            cell.value = p.nome;
            cell.alignment = { textRotation: 45, vertical: 'bottom' };
            cell.font = { name: 'Calibri', size: 12, italic: true };
            setBordo(cell);
        });
        ws.getRow(1).height = 139.5;

        // ---- Riga 2: prezzi ----
        const cellPrezziLabel = ws.getCell(2, COL_DATA);
        cellPrezziLabel.value = 'Prezzi';
        cellPrezziLabel.fill = FILL_GRIGIO;
        cellPrezziLabel.alignment = { horizontal: 'right' };
        cellPrezziLabel.border = { left: NERO_THIN, right: NERO_THIN };

        prodotti.forEach((p, i) => {
            const cell = ws.getCell(2, COL_PROD_START + i);
            cell.value = p.prezzo;
            cell.numFmt = FMT_EURO_RIGA;
            cell.fill = FILL_VERDE;
            cell.alignment = { horizontal: 'center' };
            cell.border = { left: NERO_THIN, right: NERO_THIN, top: NERO_THIN, bottom: NERO_MEDIO };
        });

        const cellTotGiornoLabel = ws.getCell(2, COL_TOT_GIORNO);
        cellTotGiornoLabel.value = 'Totali giorno';
        cellTotGiornoLabel.fill = FILL_GRIGIO;
        cellTotGiornoLabel.border = { left: NERO_MEDIO, right: NERO_MEDIO, top: NERO_MEDIO, bottom: NERO_MEDIO };

        const cellTotGeneraleLabel = ws.getCell(2, COL_TOT_GENERALE);
        cellTotGeneraleLabel.value = 'Totale generale';
        cellTotGeneraleLabel.fill = FILL_GRIGIO;
        cellTotGeneraleLabel.border = { left: NERO_MEDIO, right: NERO_MEDIO, top: NERO_MEDIO, bottom: NERO_MEDIO };

        // ---- Riga giorno (quantità + importo) ----
        const rigaQta = 3;
        const rigaImporto = 4;

        ws.mergeCells(rigaQta, COL_DATA, rigaImporto, COL_DATA);
        const cellData = ws.getCell(rigaQta, COL_DATA);
        cellData.value = etichetta;
        cellData.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
        cellData.border = { left: NERO_MEDIO, right: NERO_THIN, top: NERO_MEDIO };
        ws.getCell(rigaImporto, COL_DATA).border = { left: NERO_MEDIO, right: NERO_THIN, bottom: NERO_MEDIO };

        if (evidenzia) {
            cellData.fill = FILL_EVIDENZIA;
            ws.getCell(rigaImporto, COL_DATA).fill = FILL_EVIDENZIA;
        }

        prodotti.forEach((p, i) => {
            const col = COL_PROD_START + i;
            const colLetter = colLetters[i];
            const cellQta = ws.getCell(rigaQta, col);
            cellQta.value = quantita[p.nome] || 0;
            cellQta.border = { left: NERO_THIN, right: NERO_THIN, top: NERO_MEDIO, bottom: NERO_THIN };
            cellQta.alignment = { horizontal: 'center' };

            const cellImporto = ws.getCell(rigaImporto, col);
            cellImporto.value = { formula: `${colLetter}${rigaQta}*${colLetter}2` };
            cellImporto.numFmt = FMT_EURO_RIGA;
            cellImporto.border = { left: NERO_THIN, right: NERO_THIN, top: NERO_THIN, bottom: NERO_MEDIO };

            if (evidenzia) {
                cellQta.fill = FILL_EVIDENZIA;
                cellImporto.fill = FILL_EVIDENZIA;
            }
        });

        const colProdStartLetter = colLetters[0];
        const colProdEndLetter = colLetters[N_PROD - 1];

        ws.mergeCells(rigaQta, COL_TOT_GIORNO, rigaImporto, COL_TOT_GIORNO);
        const cellTotGiorno = ws.getCell(rigaQta, COL_TOT_GIORNO);
        cellTotGiorno.value = { formula: `SUM(${colProdStartLetter}${rigaImporto}:${colProdEndLetter}${rigaImporto})` };
        cellTotGiorno.numFmt = FMT_EURO_RIGA;
        cellTotGiorno.alignment = { vertical: 'middle', horizontal: 'center' };
        cellTotGiorno.border = { left: NERO_MEDIO, right: NERO_MEDIO, top: NERO_MEDIO, bottom: NERO_MEDIO };
        ws.getCell(rigaImporto, COL_TOT_GIORNO).border = { left: NERO_MEDIO, right: NERO_MEDIO, top: NERO_MEDIO, bottom: NERO_MEDIO };

        // con un solo giorno, "Totale generale" coincide con "Totali giorno"
        const colTotGiornoLetter = ws.getColumn(COL_TOT_GIORNO).letter;
        ws.mergeCells(rigaQta, COL_TOT_GENERALE, rigaImporto, COL_TOT_GENERALE);
        const cellTotGenerale = ws.getCell(rigaQta, COL_TOT_GENERALE);
        cellTotGenerale.value = { formula: `${colTotGiornoLetter}${rigaQta}` };
        cellTotGenerale.numFmt = FMT_EURO_TOTALE;
        cellTotGenerale.alignment = { vertical: 'middle', horizontal: 'center' };
        cellTotGenerale.border = { left: NERO_MEDIO, right: NERO_MEDIO, top: NERO_MEDIO, bottom: NERO_MEDIO };

        // ---- righe finali: Totali PZ / Totali € ----
        const rigaTotaliPZ = rigaImporto + 3; // 2 righe vuote di separazione
        ws.getCell(rigaTotaliPZ, COL_DATA).value = 'Totali PZ';
        prodotti.forEach((p, i) => {
            ws.getCell(rigaTotaliPZ, COL_PROD_START + i).value = { formula: `${colLetters[i]}${rigaQta}` };
        });
        ws.getCell(rigaTotaliPZ, COL_TOT_GENERALE).value = 'Totale a pareggio';

        const rigaTotaliEuro = rigaTotaliPZ + 1;
        ws.getCell(rigaTotaliEuro, COL_DATA).value = 'Totali €';
        prodotti.forEach((p, i) => {
            const cell = ws.getCell(rigaTotaliEuro, COL_PROD_START + i);
            cell.value = { formula: `${colLetters[i]}${rigaTotaliPZ}*${colLetters[i]}2` };
            cell.numFmt = FMT_EURO_TOTALE;
        });
        const cellPareggio = ws.getCell(rigaTotaliEuro, COL_TOT_GENERALE);
        cellPareggio.value = { formula: `SUM(${colProdStartLetter}${rigaTotaliEuro}:${colTotGiornoLetter}${rigaTotaliEuro})` };
        cellPareggio.numFmt = FMT_EURO_TOTALE;

        // ---- larghezze colonne ----
        ws.getColumn(COL_DATA).width = 15.5;
        for (let i = 0; i < N_PROD; i++) {
            ws.getColumn(COL_PROD_START + i).width = 10.5;
        }
        ws.getColumn(COL_TOT_GIORNO).width = 12;
        ws.getColumn(COL_TOT_GENERALE).width = 14;

        const total = prodotti.reduce((sum, p) => sum + (quantita[p.nome] || 0) * p.prezzo, 0);

        const suffix = label ? `_${label}` : '';
        const fileName = `venditeBar${suffix}_${getFileTimestamp()}.xlsx`;
        const { filePath, receiptData } = await writeExportFile(fileName, () => wb.xlsx.writeBuffer());

        return { fileName, filePath, total, receiptData, mimeType: XLSX_MIME_TYPE };
    }

    fastify.decorate('excelExport', { exportOrders, exportVenditeBar });

});
