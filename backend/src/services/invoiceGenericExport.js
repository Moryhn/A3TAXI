import ExcelJS from 'exceljs';
import { calculateTaxBreakdown } from './tax.js';
import { toEasternDateString } from './invoiceTemplateFill.js';

// A3TAXI's own letterhead + tax numbers — mirrors COMPANY in
// frontend/src/pages/admin/InvoicePrint.jsx so the Excel matches the printed
// invoice. Keep the two in sync if either changes.
const COMPANY = {
    name: 'A3Taxi',
    address: '785 Av Jean-Baptiste-Varin',
    cityLine: 'La Prairie, QC J5R 6P3',
    phone: '(450) 444-2000',
    email: 'a3taxi@hotmail.com',
    website: 'www.taxicandiaclaprairie.ca',
    gstNumber: '78103 0507 RT0001',
    qstNumber: '1228754711 TQ0001',
};

const CURRENCY_FORMAT = '#,##0.00 "$"';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1ECE0' } };
const THIN_BORDER = { style: 'thin', color: { argb: 'FFE4DFD3' } };

// Plain invoice workbook for clients with no Excel template of their own —
// same content as the Print view (letterhead, bill-to block, trip table,
// GST/QST breakdown), so every invoice can be exported, not just the ones
// billed against a client-supplied template.
export function buildGenericInvoiceWorkbook({
    clientName, clientAddress, clientCityLine, clientPhone, clientInvoiceDescription,
    periodStart, periodEnd, invoiceNumber, invoiceDate, trips, totalAmount,
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = COMPANY.name;
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Facture');

    sheet.columns = [
        { width: 14 }, { width: 22 }, { width: 38 }, { width: 38 }, { width: 14 },
    ];

    sheet.getCell('A1').value = COMPANY.name;
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A2').value = COMPANY.address;
    sheet.getCell('A3').value = COMPANY.cityLine;
    sheet.getCell('A4').value = COMPANY.phone;
    sheet.getCell('A5').value = `${COMPANY.email} · ${COMPANY.website}`;

    sheet.getCell('E1').value = 'FACTURE';
    sheet.getCell('E1').font = { bold: true, size: 16 };
    sheet.getCell('E1').alignment = { horizontal: 'right' };
    sheet.getCell('E2').value = `Date : ${invoiceDate}`;
    sheet.getCell('E3').value = `Facture N° : ${invoiceNumber}`;
    sheet.getCell('E2').alignment = { horizontal: 'right' };
    sheet.getCell('E3').alignment = { horizontal: 'right' };

    sheet.getCell('A7').value = 'FACTURÉ À';
    sheet.getCell('A7').font = { bold: true, size: 9, color: { argb: 'FF6B6455' } };
    sheet.getCell('A8').value = clientName;
    sheet.getCell('A8').font = { bold: true, size: 12 };
    let row = 9;
    for (const line of [clientAddress, clientCityLine, clientPhone]) {
        if (line) sheet.getCell(`A${row++}`).value = line;
    }
    sheet.getCell(`A${row}`).value = `Période : ${periodStart} — ${periodEnd}`;
    row += 2;

    const headerRow = row;
    ['Date', 'Description', 'Départ', 'Arrivée', 'Montant'].forEach((label, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = label;
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
        cell.border = { bottom: THIN_BORDER };
        if (i === 4) cell.alignment = { horizontal: 'right' };
    });

    row = headerRow + 1;
    for (const trip of trips) {
        sheet.getCell(row, 1).value = toEasternDateString(trip.trip_date);
        sheet.getCell(row, 2).value = clientInvoiceDescription || trip.driver_name || '';
        sheet.getCell(row, 3).value = trip.departure_location;
        sheet.getCell(row, 4).value = trip.arrival_location;
        const amountCell = sheet.getCell(row, 5);
        amountCell.value = Number(trip.amount);
        amountCell.numFmt = CURRENCY_FORMAT;
        for (let col = 1; col <= 5; col++) sheet.getCell(row, col).border = { bottom: THIN_BORDER };
        row++;
    }

    const tax = calculateTaxBreakdown(totalAmount);
    row += 1;
    for (const [label, value, bold] of [
        ['Sous-total', tax.preTax, false],
        ['TPS (5 %)', tax.gst, false],
        ['TVQ (9,975 %)', tax.qst, false],
        ['TOTAL', tax.total, true],
    ]) {
        const labelCell = sheet.getCell(row, 4);
        labelCell.value = label;
        labelCell.alignment = { horizontal: 'right' };
        const valueCell = sheet.getCell(row, 5);
        valueCell.value = value;
        valueCell.numFmt = CURRENCY_FORMAT;
        if (bold) {
            labelCell.font = { bold: true };
            valueCell.font = { bold: true };
            labelCell.border = { top: { style: 'medium' } };
            valueCell.border = { top: { style: 'medium' } };
        }
        row++;
    }

    row += 1;
    sheet.getCell(`A${row++}`).value = `No TPS : ${COMPANY.gstNumber}`;
    sheet.getCell(`A${row}`).value = `No TVQ : ${COMPANY.qstNumber}`;

    return workbook;
}
