import { query } from '../config/db.js';

export async function listPhones() {
    const { rows } = await query('SELECT * FROM admin_notification_phones ORDER BY created_at');
    return rows;
}

export async function listActivePhones() {
    const { rows } = await query('SELECT * FROM admin_notification_phones WHERE is_active = true ORDER BY created_at');
    return rows;
}

export async function createPhone({ phone, label }) {
    const { rows } = await query(
        'INSERT INTO admin_notification_phones (phone, label) VALUES ($1, $2) RETURNING *',
        [phone, label || '']
    );
    return rows[0];
}

export async function updatePhone(id, { phone, label, isActive }) {
    const { rows } = await query(
        `UPDATE admin_notification_phones
         SET phone = COALESCE($2, phone),
             label = COALESCE($3, label),
             is_active = COALESCE($4, is_active)
         WHERE id = $1 RETURNING *`,
        [id, phone, label, isActive]
    );
    return rows[0] || null;
}

export async function deletePhone(id) {
    const { rowCount } = await query('DELETE FROM admin_notification_phones WHERE id = $1', [id]);
    return rowCount > 0;
}
