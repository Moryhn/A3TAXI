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

export async function createAdmin({ email, passwordHash, name }) {
    const { rows } = await query(
        'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email, passwordHash, name]
    );
    return rows[0];
}
