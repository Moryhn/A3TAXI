import { query } from '../config/db.js';

export async function createReservation({
    clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
    serviceType = 'ride', passengerCount = 1, carryOnCount = 0, checkedLuggageCount = 0,
    isRoundTrip = false, distanceKm = null, isNightRate = null, estimatedPrice = null,
}) {
    const { rows } = await query(
        `INSERT INTO reservations (
            client_name, client_phone, client_email, pickup_location, dropoff_location, requested_time,
            service_type, passenger_count, carry_on_count, checked_luggage_count,
            is_round_trip, distance_km, is_night_rate, estimated_price
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
            clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
            serviceType, passengerCount, carryOnCount, checkedLuggageCount,
            isRoundTrip, distanceKm, isNightRate, estimatedPrice,
        ]
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

export async function updateReservation(id, {
    clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime, status,
    serviceType, passengerCount, carryOnCount, checkedLuggageCount,
    isRoundTrip, distanceKm, isNightRate, estimatedPrice,
}) {
    const { rows } = await query(
        `UPDATE reservations SET
            client_name = COALESCE($2, client_name),
            client_phone = COALESCE($3, client_phone),
            client_email = COALESCE($4, client_email),
            pickup_location = COALESCE($5, pickup_location),
            dropoff_location = COALESCE($6, dropoff_location),
            requested_time = COALESCE($7, requested_time),
            status = COALESCE($8, status),
            service_type = COALESCE($9, service_type),
            passenger_count = COALESCE($10, passenger_count),
            carry_on_count = COALESCE($11, carry_on_count),
            checked_luggage_count = COALESCE($12, checked_luggage_count),
            is_round_trip = COALESCE($13, is_round_trip),
            distance_km = COALESCE($14, distance_km),
            is_night_rate = COALESCE($15, is_night_rate),
            estimated_price = COALESCE($16, estimated_price)
         WHERE id = $1 RETURNING *`,
        [
            id, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime, status,
            serviceType, passengerCount, carryOnCount, checkedLuggageCount,
            isRoundTrip, distanceKm, isNightRate, estimatedPrice,
        ]
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
