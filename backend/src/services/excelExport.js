import ExcelJS from 'exceljs';
import { searchTrips } from '../models/trip.js';
import { listInvoices } from '../models/invoice.js';
import { listReservations } from '../models/reservation.js';
import { listAllDispatchJobsForExport } from '../models/dispatch.js';
import { listDrivers } from '../models/driver.js';
import { listClientAccounts } from '../models/clientAccount.js';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D2127' } };
const HEADER_FONT = { color: { argb: 'FFF5B700' }, bold: true };

function addSheet(workbook, name, columns, rows) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    sheet.getRow(1).eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    rows.forEach((row) => sheet.addRow(row));
    return sheet;
}

export async function buildExportWorkbook() {
    const [trips, invoices, reservations, jobs, drivers, clients] = await Promise.all([
        searchTrips({}),
        listInvoices({}),
        listReservations({}),
        listAllDispatchJobsForExport(),
        listDrivers(),
        listClientAccounts(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'A3TAXI';
    workbook.created = new Date();

    addSheet(workbook, 'Trips', [
        { header: 'Date', key: 'date', width: 14, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Driver', key: 'driver', width: 18 },
        { header: 'Client', key: 'client', width: 20 },
        { header: 'Departure', key: 'departure', width: 26 },
        { header: 'Arrival', key: 'arrival', width: 26 },
        { header: 'Amount', key: 'amount', width: 12, style: { numFmt: '$#,##0.00' } },
        { header: 'Invoiced', key: 'invoiced', width: 10 },
        { header: 'Has Receipt', key: 'receipt', width: 12 },
    ], trips.map((t) => ({
        date: new Date(t.trip_date),
        driver: t.driver_name,
        client: t.client_name,
        departure: t.departure_location,
        arrival: t.arrival_location,
        amount: Number(t.amount),
        invoiced: t.invoice_id ? 'Yes' : 'No',
        receipt: t.receipt_photo_url ? 'Yes' : 'No',
    })));

    addSheet(workbook, 'Invoices', [
        { header: 'Invoice #', key: 'id', width: 10 },
        { header: 'Client', key: 'client', width: 20 },
        { header: 'Period Start', key: 'periodStart', width: 14, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Period End', key: 'periodEnd', width: 14, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Total', key: 'total', width: 12, style: { numFmt: '$#,##0.00' } },
        { header: 'Generated', key: 'generated', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    ], invoices.map((inv) => ({
        id: `#${String(inv.id).padStart(4, '0')}`,
        client: inv.client_name,
        periodStart: new Date(inv.period_start),
        periodEnd: new Date(inv.period_end),
        total: Number(inv.total_amount),
        generated: new Date(inv.generated_at),
    })));

    addSheet(workbook, 'Reservations', [
        { header: 'Client Name', key: 'name', width: 20 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 24 },
        { header: 'Pickup', key: 'pickup', width: 26 },
        { header: 'Drop-off', key: 'dropoff', width: 26 },
        { header: 'Requested Time', key: 'requestedTime', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'SMS Sent', key: 'smsSent', width: 10 },
    ], reservations.map((r) => ({
        name: r.client_name,
        phone: r.client_phone,
        email: r.client_email || '',
        pickup: r.pickup_location,
        dropoff: r.dropoff_location,
        requestedTime: new Date(r.requested_time),
        status: r.status,
        smsSent: r.sms_sent ? 'Yes' : 'No',
    })));

    addSheet(workbook, 'Dispatch Jobs', [
        { header: 'Driver', key: 'driver', width: 18 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Notes', key: 'notes', width: 26 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Created', key: 'created', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    ], jobs.map((j) => ({
        driver: j.driver_name,
        address: j.address,
        notes: j.notes || '',
        status: j.status,
        created: new Date(j.created_at),
    })));

    addSheet(workbook, 'Drivers', [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Access Code', key: 'accessCode', width: 14 },
        { header: 'Active', key: 'active', width: 10 },
        { header: 'Created', key: 'created', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    ], drivers.map((d) => ({
        name: d.name,
        phone: d.phone || '',
        accessCode: d.access_code,
        active: d.is_active ? 'Yes' : 'No',
        created: new Date(d.created_at),
    })));

    addSheet(workbook, 'Client Accounts', [
        { header: 'Code', key: 'code', width: 14 },
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Contact Name', key: 'contactName', width: 20 },
        { header: 'Contact Email', key: 'contactEmail', width: 24 },
        { header: 'Contact Phone', key: 'contactPhone', width: 16 },
        { header: 'Active', key: 'active', width: 10 },
        { header: 'Created', key: 'created', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    ], clients.map((c) => ({
        code: c.code,
        name: c.name,
        contactName: c.contact_name || '',
        contactEmail: c.contact_email || '',
        contactPhone: c.contact_phone || '',
        active: c.is_active ? 'Yes' : 'No',
        created: new Date(c.created_at),
    })));

    return workbook;
}
