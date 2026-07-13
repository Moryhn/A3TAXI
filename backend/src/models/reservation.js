import { query } from '../config/db.js';

export async function createReservation({ clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime }) {
    const { rows } = await query(
        `INSERT INTO reservations (client_name, client_phone, client_email, pickup_location, dropoff_location, requested_time)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime]
    );
    return rows[0];
}

export async function markReservationSmsSent(id) {
    await query('UPDATE reservations SET sms_sent = true WHERE id = $1', [id]);
}

export async function listReservations({ dateFrom, dateTo } = {}) {
    const conditions = [];
    const params = [];
    let i = 1;
    if (dateFrom) {
        conditions.push(`requested_time >= $${i++}`);
        params.push(dateFrom);
    }
    if (dateTo) {
        conditions.push(`requested_time <= $${i++}`);
        params.push(dateTo);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT * FROM reservations ${where} ORDER BY requested_time`,
        params
    );
    return rows;
}

export async function updateReservationStatus(id, status) {
    const { rows } = await query(
        'UPDATE reservations SET status = $2 WHERE id = $1 RETURNING *',
        [id, status]
    );
    return rows[0] || null;
}
