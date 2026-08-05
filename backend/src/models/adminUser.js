import { query } from '../config/db.js';

export async function findAdminByEmail(email) {
    const { rows } = await query('SELECT * FROM admin_users WHERE email = $1', [email]);
    return rows[0] || null;
}

export async function findAdminById(id) {
    const { rows } = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function findAdminByCalendarFeedToken(token) {
    const { rows } = await query('SELECT * FROM admin_users WHERE calendar_feed_token = $1', [token]);
    return rows[0] || null;
}

export async function setCalendarFeedToken(adminId, token) {
    const { rows } = await query(
        'UPDATE admin_users SET calendar_feed_token = $2 WHERE id = $1 RETURNING *',
        [adminId, token]
    );
    return rows[0] || null;
}

export async function setAutoDispatchEnabled(adminId, enabled) {
    const { rows } = await query(
        'UPDATE admin_users SET auto_dispatch_enabled = $2 WHERE id = $1 RETURNING *',
        [adminId, enabled]
    );
    return rows[0] || null;
}

// A single owner-operator app: "is auto-dispatch on" just means any admin
// has switched it on, not tied to which admin happens to be logged in when
// a public book-now request comes through.
export async function findAdminWithAutoDispatchEnabled() {
    const { rows } = await query('SELECT * FROM admin_users WHERE auto_dispatch_enabled = true LIMIT 1');
    return rows[0] || null;
}

export async function setOutlookOauthState(adminId, state) {
    const { rows } = await query(
        'UPDATE admin_users SET outlook_oauth_state = $2 WHERE id = $1 RETURNING *',
        [adminId, state]
    );
    return rows[0] || null;
}

export async function findAdminByOutlookOauthState(state) {
    const { rows } = await query('SELECT * FROM admin_users WHERE outlook_oauth_state = $1', [state]);
    return rows[0] || null;
}

export async function setOutlookTokens(adminId, { accessToken, refreshToken, expiresAt }) {
    const { rows } = await query(
        `UPDATE admin_users
         SET outlook_access_token = $2, outlook_refresh_token = $3, outlook_token_expires_at = $4, outlook_oauth_state = NULL
         WHERE id = $1 RETURNING *`,
        [adminId, accessToken, refreshToken, expiresAt]
    );
    return rows[0] || null;
}

export async function clearOutlookTokens(adminId) {
    const { rows } = await query(
        `UPDATE admin_users
         SET outlook_access_token = NULL, outlook_refresh_token = NULL, outlook_token_expires_at = NULL, outlook_oauth_state = NULL
         WHERE id = $1 RETURNING *`,
        [adminId]
    );
    return rows[0] || null;
}

export async function createAdmin({ email, passwordHash, name }) {
    const { rows } = await query(
        'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email, passwordHash, name]
    );
    return rows[0];
}
