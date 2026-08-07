import { query } from '../config/db.js';

export async function listMessagesForJob(jobId) {
    const { rows } = await query(
        'SELECT * FROM job_messages WHERE dispatch_job_id = $1 ORDER BY created_at',
        [jobId]
    );
    return rows;
}

export async function createOutboundMessage(jobId, body, status = 'sent', error = null) {
    const { rows } = await query(
        `INSERT INTO job_messages (dispatch_job_id, direction, body, status, error)
         VALUES ($1, 'outbound', $2, $3, $4) RETURNING *`,
        [jobId, body, status, error]
    );
    return rows[0];
}

export async function createInboundMessage(jobId, body) {
    const { rows } = await query(
        `INSERT INTO job_messages (dispatch_job_id, direction, body, status)
         VALUES ($1, 'inbound', $2, 'received') RETURNING *`,
        [jobId, body]
    );
    return rows[0];
}

// Matches an inbound SMS reply to the driver conversation it belongs to: the
// most recently created active (not completed/cancelled) job for that
// customer phone. Compares only the last 10 digits of both sides —
// customer_phone is stored however it was typed (dashes, spaces, with or
// without country code), while SMS Gate's webhook sender field has its own
// format, so an exact string match would miss most real replies.
export async function findActiveJobByPhone(phone) {
    const { rows } = await query(
        `SELECT * FROM dispatch_jobs
         WHERE status IN ('pending', 'accepted')
           AND RIGHT(regexp_replace(customer_phone, '\\D', '', 'g'), 10) = RIGHT(regexp_replace($1, '\\D', '', 'g'), 10)
         ORDER BY created_at DESC LIMIT 1`,
        [phone]
    );
    return rows[0] || null;
}
