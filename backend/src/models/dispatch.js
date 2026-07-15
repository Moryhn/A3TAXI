import crypto from 'crypto';
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

export async function createDispatchJob({
    driverId = null, address, notes, assignedBy, jobType = 'ride',
    dropoffLocation = null, customerPhone = null, estimatedPrice = null,
}) {
    const trackingToken = crypto.randomBytes(24).toString('base64url');
    const { rows } = await query(
        `INSERT INTO dispatch_jobs (driver_id, address, notes, assigned_by, job_type, dropoff_location, customer_phone, estimated_price, tracking_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [driverId, address, notes, assignedBy, jobType, dropoffLocation, customerPhone, estimatedPrice, trackingToken]
    );
    return rows[0];
}

// Public "track my ride" page looks the job up by its unguessable token,
// never by sequential id.
export async function findDispatchJobByTrackingToken(token) {
    const { rows } = await query(
        `SELECT j.*, d.name AS driver_name
         FROM dispatch_jobs j
         LEFT JOIN drivers d ON d.id = j.driver_id
         WHERE j.tracking_token = $1`,
        [token]
    );
    return rows[0] || null;
}

export async function latestPositionForDriver(driverId) {
    const { rows } = await query(
        `SELECT driver_id, lat, lng, recorded_at FROM driver_positions
         WHERE driver_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
        [driverId]
    );
    return rows[0] || null;
}

// Admin picks a driver for a customer-submitted "book now" request (driver_id
// was NULL until this point) — also used if we ever let admin reassign a job.
export async function assignDriverToJob(jobId, driverId, adminId) {
    const { rows } = await query(
        `UPDATE dispatch_jobs SET driver_id = $2, assigned_by = $3, updated_at = now() WHERE id = $1 RETURNING *`,
        [jobId, driverId, adminId]
    );
    return rows[0] || null;
}

export async function listDispatchJobsForDriver(driverId, status) {
    const params = [driverId];
    let where = 'driver_id = $1 AND deleted_at IS NULL';
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

// Admin view: every dispatched job across all drivers
export async function listAllDispatchJobs(limit = 50) {
    const { rows } = await query(
        `SELECT j.*, d.name AS driver_name
         FROM dispatch_jobs j
         LEFT JOIN drivers d ON d.id = j.driver_id
         WHERE j.deleted_at IS NULL
         ORDER BY j.created_at DESC
         LIMIT $1`,
        [limit]
    );
    return rows;
}

// Unlimited version for full data export
export async function listAllDispatchJobsForExport() {
    const { rows } = await query(
        `SELECT j.*, d.name AS driver_name
         FROM dispatch_jobs j
         LEFT JOIN drivers d ON d.id = j.driver_id
         WHERE j.deleted_at IS NULL
         ORDER BY j.created_at DESC`
    );
    return rows;
}

export async function updateDispatchJob(jobId, { address, notes, jobType }) {
    const { rows } = await query(
        `UPDATE dispatch_jobs SET
            address = COALESCE($2, address),
            notes = COALESCE($3, notes),
            job_type = COALESCE($4, job_type),
            updated_at = now()
         WHERE id = $1 RETURNING *`,
        [jobId, address, notes, jobType]
    );
    return rows[0] || null;
}

export async function deleteDispatchJob(jobId) {
    await query('UPDATE dispatch_jobs SET deleted_at = now() WHERE id = $1', [jobId]);
}

export async function restoreDispatchJob(jobId) {
    const { rows } = await query('UPDATE dispatch_jobs SET deleted_at = NULL WHERE id = $1 RETURNING *', [jobId]);
    return rows[0] || null;
}

export async function permanentlyDeleteDispatchJob(jobId) {
    await query('DELETE FROM dispatch_jobs WHERE id = $1', [jobId]);
}

export async function listDeletedDispatchJobs() {
    const { rows } = await query(
        `SELECT j.*, d.name AS driver_name
         FROM dispatch_jobs j
         LEFT JOIN drivers d ON d.id = j.driver_id
         WHERE j.deleted_at IS NOT NULL
         ORDER BY j.deleted_at DESC`
    );
    return rows;
}
