import { query } from '../config/db.js';

// A subscription belongs to exactly one of driver/admin (enforced by the
// push_subscriptions_owner_check constraint) — callers pass whichever applies.
export async function saveSubscription({ driverId = null, adminId = null }, { endpoint, keys }) {
    const { rows } = await query(
        `INSERT INTO push_subscriptions (driver_id, admin_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (endpoint) DO UPDATE SET driver_id = $1, admin_id = $2, p256dh = $4, auth = $5
         RETURNING *`,
        [driverId, adminId, endpoint, keys.p256dh, keys.auth]
    );
    return rows[0];
}

export async function listSubscriptionsForDriver(driverId) {
    const { rows } = await query('SELECT * FROM push_subscriptions WHERE driver_id = $1', [driverId]);
    return rows;
}

// Single owner-operator app: any admin's subscriptions receive every admin
// notification, same "any admin" pattern as findAdminWithAutoDispatchEnabled.
export async function listSubscriptionsForAdmin() {
    const { rows } = await query('SELECT * FROM push_subscriptions WHERE admin_id IS NOT NULL');
    return rows;
}

export async function deleteSubscriptionByEndpoint(endpoint) {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}
