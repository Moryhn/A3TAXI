import ExcelJS from 'exceljs';

const CELL_REF = /^[A-Z]{1,3}\d{1,7}$/;
const COL_REF = /^[A-Z]{1,3}$/;

// trip_date is a timestamptz (a real moment), not a calendar date — the
// admin's Print view shows it in the browser's local time (Eastern), so a
// trip logged late evening can fall on the *next* UTC day. The server runs
// in UTC (Render), so a plain toISOString().slice(0,10) would silently
// disagree with what Print already shows for the same trip.
function toEasternDateString(value) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date(value));
}

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

// A real invoice template's trip table almost always ends in a running
// total like "=SUM(F16:F29)" somewhere below it — that formula's own range
// is the most reliable signal for how many rows the table actually spans,
// since neither the mapping nor the sheet's dimensions say so directly.
function findTableExtent(sheet, amountCol, startRow) {
    const sumPattern = new RegExp(`SUM\\(\\$?${amountCol}\\$?${startRow}:\\$?${amountCol}\\$?(\\d+)\\)`, 'i');
    let extent = null;
    sheet.eachRow({ includeEmpty: false }, (row) => {
        if (extent !== null) return;
        row.eachCell({ includeEmpty: false }, (cell) => {
            if (extent !== null) return;
            const formula = cell.formula;
            const match = typeof formula === 'string' && formula.match(sumPattern);
            if (match) extent = parseInt(match[1], 10);
        });
    });
    return extent;
}

// Writes invoice data into a loaded template workbook's mapped cells,
// in place. The caller streams/uploads the workbook afterward.
export function fillInvoiceTemplate(workbook, {
    clientName, periodLabel, trips, clientAddress, clientCityLine, clientPhone, invoiceNumber, invoiceDate,
    clientInvoiceDescription,
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

    // Clear the whole known table extent before writing real data — both
    // reasons matter: (1) a shared-formula column (amount = rate*quantity
    // dragged down many rows) leaves orphaned formula cells pointing at a
    // master we're about to overwrite, which exceljs refuses to save; and
    // (2) a reused template can carry old example rows (leftover text from
    // a previous invoice) past however many real trips we're writing this
    // time, which would otherwise bleed through onto the export untouched.
    const tableExtent = findTableExtent(sheet, cols.amount, mapping.trip_row_start);
    if (tableExtent !== null) {
        for (const col of Object.values(cols)) {
            for (let r = mapping.trip_row_start; r <= tableExtent; r++) {
                sheet.getCell(`${col}${r}`).value = null;
            }
        }
    }

    let row = mapping.trip_row_start;
    for (const trip of trips) {
        sheet.getCell(`${cols.date}${row}`).value = toEasternDateString(trip.trip_date);
        sheet.getCell(`${cols.description}${row}`).value = clientInvoiceDescription || trip.driver_name || '';
        sheet.getCell(`${cols.departure}${row}`).value = trip.departure_location;
        sheet.getCell(`${cols.arrival}${row}`).value = trip.arrival_location;
        sheet.getCell(`${cols.amount}${row}`).value = Number(trip.amount);
        row += 1;
    }

    return workbook;
}
