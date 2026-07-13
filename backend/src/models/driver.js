import { query } from '../config/db.js';

export async function findDriverByAccessCode(accessCode) {
    const { rows } = await query(
        'SELECT * FROM drivers WHERE access_code = $1 AND is_active = true',
        [accessCode]
    );
    return rows[0] || null;
}

export async function findDriverById(id) {
    const { rows } = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function listDrivers() {
    const { rows } = await query('SELECT id, name, phone, access_code, is_active, created_at FROM drivers ORDER BY name');
    return rows;
}

export async function createDriver({ name, phone, accessCode }) {
    const { rows } = await query(
        'INSERT INTO drivers (name, phone, access_code) VALUES ($1, $2, $3) RETURNING *',
        [name, phone, accessCode]
    );
    return rows[0];
}
