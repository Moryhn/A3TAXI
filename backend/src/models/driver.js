import { query } from '../config/db.js';

export async function findDriverByAccessCode(accessCode) {
    const { rows } = await query(
        'SELECT * FROM drivers WHERE UPPER(access_code) = UPPER($1) AND is_active = true',
        [accessCode.trim()]
    );
    return rows[0] || null;
}

export async function findDriverById(id) {
    const { rows } = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function listDrivers() {
    const { rows } = await query('SELECT id, name, phone, access_code, is_active, created_at FROM drivers WHERE deleted_at IS NULL ORDER BY name');
    return rows;
}

export async function createDriver({ name, phone, accessCode }) {
    const { rows } = await query(
        'INSERT INTO drivers (name, phone, access_code) VALUES ($1, $2, $3) RETURNING *',
        [name, phone, accessCode]
    );
    return rows[0];
}

export async function updateDriver(id, { name, phone, isActive }) {
    const { rows } = await query(
        `UPDATE drivers SET
            name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            is_active = COALESCE($4, is_active)
         WHERE id = $1 RETURNING *`,
        [id, name, phone, isActive]
    );
    return rows[0] || null;
}

export async function deleteDriver(id) {
    const { rows } = await query(
        'UPDATE drivers SET deleted_at = now(), is_active = false WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0] || null;
}

export async function restoreDriver(id) {
    const { rows } = await query(
        'UPDATE drivers SET deleted_at = NULL, is_active = true WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0] || null;
}

export async function permanentlyDeleteDriver(id) {
    await query('DELETE FROM drivers WHERE id = $1', [id]);
}

export async function listDeletedDrivers() {
    const { rows } = await query('SELECT * FROM drivers WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    return rows;
}
