import { query } from '../config/db.js';

export async function createTrip({ driverId, clientAccountId, departureLocation, arrivalLocation, amount, receiptPhotoUrl }) {
    const { rows } = await query(
        `INSERT INTO trips (driver_id, client_account_id, departure_location, arrival_location, amount, receipt_photo_url)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [driverId, clientAccountId, departureLocation, arrivalLocation, amount, receiptPhotoUrl]
    );
    return rows[0];
}

export async function searchTrips({ driverId, clientAccountId, dateFrom, dateTo, invoiced }) {
    const conditions = ['t.deleted_at IS NULL'];
    const params = [];
    let i = 1;

    if (driverId) {
        conditions.push(`t.driver_id = $${i++}`);
        params.push(driverId);
    }
    if (clientAccountId) {
        conditions.push(`t.client_account_id = $${i++}`);
        params.push(clientAccountId);
    }
    if (dateFrom) {
        conditions.push(`t.trip_date >= $${i++}`);
        params.push(dateFrom);
    }
    if (dateTo) {
        conditions.push(`t.trip_date <= $${i++}`);
        params.push(dateTo);
    }
    if (invoiced === false) {
        conditions.push(`t.invoice_id IS NULL`);
    } else if (invoiced === true) {
        conditions.push(`t.invoice_id IS NOT NULL`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
        `SELECT t.*, d.name AS driver_name, c.name AS client_name, c.code AS client_code
         FROM trips t
         JOIN drivers d ON d.id = t.driver_id
         JOIN client_accounts c ON c.id = t.client_account_id
         ${where}
         ORDER BY t.trip_date DESC`,
        params
    );
    return rows;
}

export async function markTripsInvoiced(tripIds, invoiceId) {
    await query('UPDATE trips SET invoice_id = $1 WHERE id = ANY($2::int[])', [invoiceId, tripIds]);
}

export async function findTripById(id) {
    const { rows } = await query('SELECT * FROM trips WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function updateTrip(id, { departureLocation, arrivalLocation, amount }) {
    const { rows } = await query(
        `UPDATE trips SET
            departure_location = COALESCE($2, departure_location),
            arrival_location = COALESCE($3, arrival_location),
            amount = COALESCE($4, amount)
         WHERE id = $1 RETURNING *`,
        [id, departureLocation, arrivalLocation, amount]
    );
    return rows[0] || null;
}

export async function deleteTrip(id) {
    await query('UPDATE trips SET deleted_at = now() WHERE id = $1', [id]);
}

export async function restoreTrip(id) {
    const { rows } = await query('UPDATE trips SET deleted_at = NULL WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
}

export async function permanentlyDeleteTrip(id) {
    await query('DELETE FROM trips WHERE id = $1', [id]);
}

export async function listDeletedTrips() {
    const { rows } = await query(
        `SELECT t.*, d.name AS driver_name, c.name AS client_name
         FROM trips t
         JOIN drivers d ON d.id = t.driver_id
         JOIN client_accounts c ON c.id = t.client_account_id
         WHERE t.deleted_at IS NOT NULL
         ORDER BY t.deleted_at DESC`
    );
    return rows;
}
