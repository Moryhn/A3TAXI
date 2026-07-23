import { query } from '../config/db.js';

export async function listLedgerEntries(driverId, { dateFrom, dateTo } = {}) {
    const conditions = ['driver_id = $1', 'deleted_at IS NULL'];
    const params = [driverId];
    let i = 2;

    if (dateFrom) {
        conditions.push(`entry_date >= $${i++}`);
        params.push(dateFrom);
    }
    if (dateTo) {
        conditions.push(`entry_date <= $${i++}`);
        params.push(dateTo);
    }

    const { rows } = await query(
        `SELECT * FROM driver_ledger_entries
         WHERE ${conditions.join(' AND ')}
         ORDER BY entry_date DESC, created_at DESC`,
        params
    );
    return rows;
}

// Dues owed minus payments received minus the value of every trip the driver
// has completed — trip revenue always credits against dues, whether or not
// that trip has since been invoiced to the client (invoicing is a separate,
// company-level event and doesn't change what the driver has already earned
// toward their own dues).
//
// asOfDate makes this a historical snapshot instead of the live balance: a
// trip only counts if it happened by that date, and a client only counts as
// still active "as of" that date if it wasn't archived yet by then
// (deleted_at is after asOfDate) — compared using the state each row
// actually had at that point in time, not today's state.
export async function getDriverBalance(driverId, asOfDate = new Date()) {
    const { rows } = await query(
        `SELECT
            COALESCE((SELECT SUM(CASE WHEN type = 'charge' THEN amount ELSE -amount END)
                      FROM driver_ledger_entries
                      WHERE driver_id = $1 AND deleted_at IS NULL AND entry_date <= $2::date), 0)
            - COALESCE((SELECT SUM(t.amount)
                        FROM trips t
                        JOIN client_accounts c ON c.id = t.client_account_id
                        WHERE t.driver_id = $1 AND t.deleted_at IS NULL
                          AND t.trip_date::date <= $2::date
                          AND (c.deleted_at IS NULL OR c.deleted_at::date > $2::date)), 0)
            AS balance`,
        [driverId, asOfDate]
    );
    return Number(rows[0].balance);
}

export async function addLedgerEntry({ driverId, type, amount, entryDate, note = null }) {
    const { rows } = await query(
        `INSERT INTO driver_ledger_entries (driver_id, type, amount, entry_date, note)
         VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5) RETURNING *`,
        [driverId, type, amount, entryDate || null, note]
    );
    return rows[0];
}

export async function findLedgerEntryById(id) {
    const { rows } = await query('SELECT * FROM driver_ledger_entries WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function deleteLedgerEntry(id) {
    const { rows } = await query(
        'UPDATE driver_ledger_entries SET deleted_at = now() WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0] || null;
}
