import { query } from '../config/db.js';

export async function listLedgerEntries(driverId) {
    const { rows } = await query(
        `SELECT * FROM driver_ledger_entries
         WHERE driver_id = $1 AND deleted_at IS NULL
         ORDER BY entry_date DESC, created_at DESC`,
        [driverId]
    );
    return rows;
}

// Dues owed minus payments received minus the value of trips the driver has
// already completed but that haven't been invoiced to the client yet — those
// trips are credited against dues automatically. Once a trip gets invoiced,
// its credit is expected to be locked in as a manual ledger payment entry,
// at which point it drops out of this live subtraction.
export async function getDriverBalance(driverId) {
    const { rows } = await query(
        `SELECT
            COALESCE((SELECT SUM(CASE WHEN type = 'charge' THEN amount ELSE -amount END)
                      FROM driver_ledger_entries
                      WHERE driver_id = $1 AND deleted_at IS NULL), 0)
            - COALESCE((SELECT SUM(amount)
                        FROM trips
                        WHERE driver_id = $1 AND deleted_at IS NULL AND invoice_id IS NULL), 0)
            AS balance`,
        [driverId]
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
