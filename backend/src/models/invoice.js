import { query } from '../config/db.js';

export async function createInvoice({ clientAccountId, periodStart, periodEnd, totalAmount }) {
    const { rows } = await query(
        `INSERT INTO invoices (client_account_id, period_start, period_end, total_amount)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientAccountId, periodStart, periodEnd, totalAmount]
    );
    return rows[0];
}

export async function findInvoiceById(id) {
    const { rows } = await query(
        `SELECT i.*, c.name AS client_name, c.code AS client_code
         FROM invoices i JOIN client_accounts c ON c.id = i.client_account_id
         WHERE i.id = $1`,
        [id]
    );
    return rows[0] || null;
}

export async function listInvoices({ clientAccountId } = {}) {
    const conditions = [];
    const params = [];
    if (clientAccountId) {
        conditions.push('i.client_account_id = $1');
        params.push(clientAccountId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT i.*, c.name AS client_name, c.code AS client_code
         FROM invoices i JOIN client_accounts c ON c.id = i.client_account_id
         ${where}
         ORDER BY i.generated_at DESC`,
        params
    );
    return rows;
}

export async function invoiceTrips(invoiceId) {
    const { rows } = await query(
        `SELECT t.id, t.trip_date, t.departure_location, t.arrival_location, t.amount, d.name AS driver_name
         FROM trips t JOIN drivers d ON d.id = t.driver_id
         WHERE t.invoice_id = $1
         ORDER BY t.trip_date`,
        [invoiceId]
    );
    return rows;
}
