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
    const conditions = ['deleted_at IS NULL'];
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

export async function updateReservation(id, { clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime, status }) {
    const { rows } = await query(
        `UPDATE reservations SET
            client_name = COALESCE($2, client_name),
            client_phone = COALESCE($3, client_phone),
            client_email = COALESCE($4, client_email),
            pickup_location = COALESCE($5, pickup_location),
            dropoff_location = COALESCE($6, dropoff_location),
            requested_time = COALESCE($7, requested_time),
            status = COALESCE($8, status)
         WHERE id = $1 RETURNING *`,
        [id, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime, status]
    );
    return rows[0] || null;
}

export async function deleteReservation(id) {
    await query('UPDATE reservations SET deleted_at = now() WHERE id = $1', [id]);
}

export async function restoreReservation(id) {
    const { rows } = await query('UPDATE reservations SET deleted_at = NULL WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
}

export async function permanentlyDeleteReservation(id) {
    await query('DELETE FROM reservations WHERE id = $1', [id]);
}

export async function listDeletedReservations() {
    const { rows } = await query('SELECT * FROM reservations WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    return rows;
}
