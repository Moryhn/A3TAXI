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
export function validateFieldMapping(mapping) {
    const errors = [];
    if (!mapping || typeof mapping !== 'object') return ['fieldMapping must be an object'];

    if (mapping.client_name && !CELL_REF.test(mapping.client_name)) {
        errors.push('client_name must be a cell reference like B10');
    }
    if (mapping.period && !CELL_REF.test(mapping.period)) {
        errors.push('period must be a cell reference like B4');
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
export function fillInvoiceTemplate(workbook, { clientName, periodLabel, trips }, mapping) {
    const sheet = workbook.worksheets[0];

    if (mapping.client_name) sheet.getCell(mapping.client_name).value = clientName;
    if (mapping.period) sheet.getCell(mapping.period).value = periodLabel;

    const cols = mapping.trip_columns;
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
