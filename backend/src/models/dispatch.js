import { query } from '../config/db.js';

export async function recordDriverPosition(driverId, lat, lng) {
    const { rows } = await query(
        'INSERT INTO driver_positions (driver_id, lat, lng) VALUES ($1, $2, $3) RETURNING *',
        [driverId, lat, lng]
    );
    return rows[0];
}

// Latest known position for every active driver, for the admin live map
export async function latestPositions() {
    const { rows } = await query(
        `SELECT DISTINCT ON (dp.driver_id) dp.driver_id, d.name AS driver_name, dp.lat, dp.lng, dp.recorded_at
         FROM driver_positions dp
         JOIN drivers d ON d.id = dp.driver_id
         WHERE d.is_active = true
         ORDER BY dp.driver_id, dp.recorded_at DESC`
    );
    return rows;
}

export async function createDispatchJob({ driverId, address, notes, assignedBy }) {
    const { rows } = await query(
        `INSERT INTO dispatch_jobs (driver_id, address, notes, assigned_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [driverId, address, notes, assignedBy]
    );
    return rows[0];
}

export async function listDispatchJobsForDriver(driverId, status) {
    const params = [driverId];
    let where = 'driver_id = $1';
    if (status) {
        params.push(status);
        where += ` AND status = $2`;
    }
    const { rows } = await query(
        `SELECT * FROM dispatch_jobs WHERE ${where} ORDER BY created_at DESC`,
        params
    );
    return rows;
}

export async function updateDispatchJobStatus(jobId, status) {
    const { rows } = await query(
        `UPDATE dispatch_jobs SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
        [jobId, status]
    );
    return rows[0] || null;
}
