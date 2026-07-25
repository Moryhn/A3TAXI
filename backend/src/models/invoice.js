import { query } from '../config/db.js';

export async function createInvoice({
    clientAccountId, periodStart, periodEnd, totalAmount, invoiceNumber = null, invoiceDate = null,
}) {
    const { rows } = await query(
        `INSERT INTO invoices (client_account_id, period_start, period_end, total_amount, invoice_number, invoice_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [clientAccountId, periodStart, periodEnd, totalAmount, invoiceNumber, invoiceDate]
    );
    return rows[0];
}

// One invoice per client per period, no matter how many drivers' trips feed
// into it or how many times admin re-runs "Generate" — later generations for
// the same client+period top up this invoice instead of creating a duplicate.
// Excludes finalized invoices for the same reason as findLatestInvoiceForClient
// below: once sent to the client, an invoice must stop absorbing new trips,
// even if the exact same period is requested again.
export async function findInvoiceByClientAndPeriod(clientAccountId, periodStart, periodEnd) {
    const { rows } = await query(
        `SELECT * FROM invoices WHERE client_account_id = $1 AND period_start = $2 AND period_end = $3 AND deleted_at IS NULL AND finalized_at IS NULL`,
        [clientAccountId, periodStart, periodEnd]
    );
    return rows[0] || null;
}

// A client has at most one "current" invoice at a time: if Generate is run
// again with a different date range than before (e.g. extending the end date
// to pick up a few more days), this finds that same invoice instead of the
// exact-period lookup above missing it and starting a second, overlapping one.
// Excludes finalized invoices — once one has been sent to the client it must
// stop changing, so a finalized invoice never absorbs new trips; the next
// Generate starts a fresh one instead. Admin can also delete an invoice
// (Trash, restorable) to deliberately start fresh before finalizing.
export async function findLatestInvoiceForClient(clientAccountId) {
    const { rows } = await query(
        `SELECT * FROM invoices WHERE client_account_id = $1 AND deleted_at IS NULL AND finalized_at IS NULL ORDER BY generated_at DESC LIMIT 1`,
        [clientAccountId]
    );
    return rows[0] || null;
}

// One-way: once sent to the client, an invoice is locked from further edits
// and stops absorbing new trips via Generate. To correct a finalized invoice,
// admin deletes it (Trash, restorable) rather than un-finalizing it in place.
export async function finalizeInvoice(id) {
    const { rows } = await query(
        `UPDATE invoices SET finalized_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
        [id]
    );
    return rows[0] || null;
}

// Widens an invoice's period to cover both its existing range and a newly
// requested one, so re-generating with a shifted date range doesn't leave the
// invoice's stated period narrower than the trips actually listed on it.
export async function widenInvoicePeriod(id, periodStart, periodEnd) {
    const { rows } = await query(
        `UPDATE invoices SET
            period_start = LEAST(period_start, $2::date),
            period_end = GREATEST(period_end, $3::date)
         WHERE id = $1 RETURNING *`,
        [id, periodStart, periodEnd]
    );
    return rows[0] || null;
}

export async function updateInvoice(id, { invoiceNumber, invoiceDate }) {
    const { rows } = await query(
        `UPDATE invoices SET
            invoice_number = COALESCE($2, invoice_number),
            invoice_date = COALESCE($3, invoice_date)
         WHERE id = $1 RETURNING *`,
        [id, invoiceNumber, invoiceDate]
    );
    return rows[0] || null;
}

// Locks in which template an invoice uses the first time one is available for
// its client — a no-op if it's already set, so uploading a newer template
// for the client later doesn't silently reshuffle an in-progress invoice.
export async function setInvoiceTemplateIfUnset(invoiceId, templateId) {
    const { rows } = await query(
        `UPDATE invoices SET template_id = $2 WHERE id = $1 AND template_id IS NULL RETURNING *`,
        [invoiceId, templateId]
    );
    return rows[0] || null;
}

export async function addAmountToInvoice(invoiceId, additionalAmount) {
    const { rows } = await query(
        `UPDATE invoices SET total_amount = total_amount + $2 WHERE id = $1 RETURNING *`,
        [invoiceId, additionalAmount]
    );
    return rows[0];
}

// Keeps total_amount truthful to its line items whenever a trip on an
// already-invoiced invoice is edited or removed (admin can now correct a
// wrong amount/route/date after generation instead of the invoice being
// permanently locked).
export async function recalculateInvoiceTotal(invoiceId) {
    const { rows } = await query(
        `UPDATE invoices SET total_amount = (
            SELECT COALESCE(SUM(amount), 0) FROM trips WHERE invoice_id = $1 AND deleted_at IS NULL
         ) WHERE id = $1 RETURNING *`,
        [invoiceId]
    );
    return rows[0] || null;
}

export async function findInvoiceById(id) {
    const { rows } = await query(
        `SELECT i.*, c.name AS client_name, c.code AS client_code, c.address AS client_address,
                c.city AS client_city, c.postal_code AS client_postal_code,
                c.contact_phone AS client_phone, c.invoice_description AS client_invoice_description
         FROM invoices i JOIN client_accounts c ON c.id = i.client_account_id
         WHERE i.id = $1`,
        [id]
    );
    return rows[0] || null;
}

export async function listInvoices({ clientAccountId } = {}) {
    const conditions = ['i.deleted_at IS NULL'];
    const params = [];
    if (clientAccountId) {
        conditions.push(`i.client_account_id = $${params.length + 1}`);
        params.push(clientAccountId);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query(
        `SELECT i.*, c.name AS client_name, c.code AS client_code
         FROM invoices i JOIN client_accounts c ON c.id = i.client_account_id
         ${where}
         ORDER BY i.generated_at DESC`,
        params
    );
    return rows;
}

// Deleting an invoice releases its trips back to the un-invoiced pool (rather
// than leaving them permanently stuck pointing at a trashed invoice), so a
// wrongly-generated invoice can be deleted and its trips picked up again by
// the next "Generate" for that client.
export async function deleteInvoice(id) {
    await query('UPDATE trips SET invoice_id = NULL WHERE invoice_id = $1', [id]);
    await query('UPDATE invoices SET deleted_at = now() WHERE id = $1', [id]);
}

export async function restoreInvoice(id) {
    const { rows } = await query('UPDATE invoices SET deleted_at = NULL WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
}

export async function permanentlyDeleteInvoice(id) {
    await query('UPDATE trips SET invoice_id = NULL WHERE invoice_id = $1', [id]);
    await query('DELETE FROM invoices WHERE id = $1', [id]);
}

export async function listDeletedInvoices() {
    const { rows } = await query(
        `SELECT i.*, c.name AS client_name, c.code AS client_code
         FROM invoices i JOIN client_accounts c ON c.id = i.client_account_id
         WHERE i.deleted_at IS NOT NULL
         ORDER BY i.deleted_at DESC`
    );
    return rows;
}

export async function invoiceTrips(invoiceId) {
    const { rows } = await query(
        `SELECT t.id, t.trip_date, t.departure_location, t.arrival_location, t.amount, d.name AS driver_name
         FROM trips t JOIN drivers d ON d.id = t.driver_id
         WHERE t.invoice_id = $1 AND t.deleted_at IS NULL
         ORDER BY t.trip_date`,
        [invoiceId]
    );
    return rows;
}
