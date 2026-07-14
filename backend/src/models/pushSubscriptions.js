import { query } from '../config/db.js';

export async function saveSubscription(driverId, { endpoint, keys }) {
    const { rows } = await query(
        `INSERT INTO push_subscriptions (driver_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET driver_id = $1, p256dh = $3, auth = $4
         RETURNING *`,
        [driverId, endpoint, keys.p256dh, keys.auth]
    );
    return rows[0];
}

export async function listSubscriptionsForDriver(driverId) {
    const { rows } = await query('SELECT * FROM push_subscriptions WHERE driver_id = $1', [driverId]);
    return rows;
}

export async function deleteSubscriptionByEndpoint(endpoint) {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}
