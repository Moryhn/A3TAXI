import ExcelJS from 'exceljs';

const CELL_REF = /^[A-Z]{1,3}\d{1,7}$/;
const COL_REF = /^[A-Z]{1,3}$/;

export async function loadWorkbookFromBuffer(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook;
}

// Catches a malformed mapping (typo'd cell reference, missing column) at
// upload time, before it ever reaches a real client's invoice.
// Cell references beyond client_name/period are all optional — a client's
// template may only have some of these fields, or lay out address/phone as
// free text the admin doesn't want auto-filled.
const OPTIONAL_CELL_FIELDS = [
    'client_name', 'period', 'client_address', 'client_city_line', 'client_phone', 'invoice_number', 'invoice_date',
];

export function validateFieldMapping(mapping) {
    const errors = [];
    if (!mapping || typeof mapping !== 'object') return ['fieldMapping must be an object'];

    for (const field of OPTIONAL_CELL_FIELDS) {
        if (mapping[field] && !CELL_REF.test(mapping[field])) {
            errors.push(`${field} must be a cell reference like B10`);
        }
    }
    if (!Number.isInteger(mapping.trip_row_start) || mapping.trip_row_start < 1) {
        errors.push('trip_row_start must be a positive integer (the first row to write trip lines into)');
    }
    if (!mapping.trip_columns || typeof mapping.trip_columns !== 'object') {
        errors.push('trip_columns is required');
    } else {
        for (const key of ['date', 'description', 'departure', 'arrival', 'amount']) {
            const col = mapping.trip_columns[key];
            if (!col || !COL_REF.test(col)) errors.push(`trip_columns.${key} must be a column letter like A`);
        }
    }
    return errors;
}

// Writes invoice data into a loaded template workbook's mapped cells,
// in place. The caller streams/uploads the workbook afterward.
export function fillInvoiceTemplate(workbook, {
    clientName, periodLabel, trips, clientAddress, clientCityLine, clientPhone, invoiceNumber, invoiceDate,
}, mapping) {
    const sheet = workbook.worksheets[0];

    if (mapping.client_name) sheet.getCell(mapping.client_name).value = clientName;
    if (mapping.period) sheet.getCell(mapping.period).value = periodLabel;
    if (mapping.client_address && clientAddress) sheet.getCell(mapping.client_address).value = clientAddress;
    if (mapping.client_city_line && clientCityLine) sheet.getCell(mapping.client_city_line).value = clientCityLine;
    if (mapping.client_phone && clientPhone) sheet.getCell(mapping.client_phone).value = clientPhone;
    if (mapping.invoice_number && invoiceNumber) sheet.getCell(mapping.invoice_number).value = invoiceNumber;
    if (mapping.invoice_date && invoiceDate) sheet.getCell(mapping.invoice_date).value = invoiceDate;

    const cols = mapping.trip_columns;

    // Some templates (e.g. an amount column computed as rate*quantity) use
    // Excel "shared formulas" across the whole trip-row range: one master
    // cell holds the formula, the rest just point back at it. Overwriting
    // only some of those cells with plain values leaves the others pointing
    // at a master that's no longer a formula, which exceljs refuses to save
    // ("Shared Formula master must exist..."). A shared-formula master
    // carries a `ref` (e.g. "G17:G26") naming the group's full extent —
    // clearing exactly that range breaks the group cleanly before real data
    // goes in, without touching unrelated formulas further down the sheet
    // (a subtotal row, say) that just happen to sit in the same column.
    const scanThroughRow = mapping.trip_row_start + 200;
    for (const col of Object.values(cols)) {
        let refEndRow = null;
        for (let r = mapping.trip_row_start; r <= scanThroughRow; r++) {
            const raw = sheet.getCell(`${col}${r}`).value;
            const ref = raw && typeof raw === 'object' ? raw.ref : null;
            const match = typeof ref === 'string' && ref.match(/:[A-Z]+(\d+)$/);
            if (match) { refEndRow = parseInt(match[1], 10); break; }
        }
        if (refEndRow !== null) {
            for (let r = mapping.trip_row_start; r <= refEndRow; r++) {
                const cell = sheet.getCell(`${col}${r}`);
                if (cell.type === ExcelJS.ValueType.Formula) cell.value = null;
            }
        }
    }

    let row = mapping.trip_row_start;
    for (const trip of trips) {
        sheet.getCell(`${cols.date}${row}`).value = new Date(trip.trip_date).toISOString().slice(0, 10);
        sheet.getCell(`${cols.description}${row}`).value = trip.driver_name || '';
        sheet.getCell(`${cols.departure}${row}`).value = trip.departure_location;
        sheet.getCell(`${cols.arrival}${row}`).value = trip.arrival_location;
        sheet.getCell(`${cols.amount}${row}`).value = Number(trip.amount);
        row += 1;
    }

    return workbook;
}
