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
    const conditions = [];
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
