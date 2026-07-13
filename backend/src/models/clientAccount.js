import { query } from '../config/db.js';

export async function listClientAccounts({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE is_active = true' : '';
    const { rows } = await query(`SELECT * FROM client_accounts ${where} ORDER BY name`);
    return rows;
}

export async function findClientAccountById(id) {
    const { rows } = await query('SELECT * FROM client_accounts WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function createClientAccount({ name, code, contactName, contactEmail, contactPhone }) {
    const { rows } = await query(
        `INSERT INTO client_accounts (name, code, contact_name, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, code, contactName, contactEmail, contactPhone]
    );
    return rows[0];
}

export async function updateClientAccount(id, { name, contactName, contactEmail, contactPhone, isActive }) {
    const { rows } = await query(
        `UPDATE client_accounts
         SET name = COALESCE($2, name),
             contact_name = COALESCE($3, contact_name),
             contact_email = COALESCE($4, contact_email),
             contact_phone = COALESCE($5, contact_phone),
             is_active = COALESCE($6, is_active)
         WHERE id = $1 RETURNING *`,
        [id, name, contactName, contactEmail, contactPhone, isActive]
    );
    return rows[0] || null;
}
