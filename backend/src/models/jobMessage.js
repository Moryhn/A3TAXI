import { query, pool } from '../config/db.js';

// customer_phone is stored however it was typed (dashes, spaces, with or
// without country code), while SMS Gate's webhook sender field has its own
// format — so phones are always compared on their last 10 digits only.
const LAST10_SQL = (column) => `RIGHT(regexp_replace(${column}, '\\D', '', 'g'), 10)`;

export function last10Digits(phone) {
    return String(phone || '').replace(/\D/g, '').slice(-10);
}

// ---- Conversations tied to a dispatch job -------------------------------

export async function listMessagesForJob(jobId) {
    const { rows } = await query(
        'SELECT * FROM job_messages WHERE dispatch_job_id = $1 ORDER BY created_at',
        [jobId]
    );
    return rows;
}

export async function deleteMessagesForJob(jobId) {
    await query('DELETE FROM job_messages WHERE dispatch_job_id = $1', [jobId]);
}

export async function createOutboundMessage(jobId, body, status = 'sent', error = null) {
    const { rows } = await query(
        `INSERT INTO job_messages (dispatch_job_id, direction, body, status, error)
         VALUES ($1, 'outbound', $2, $3, $4) RETURNING *`,
        [jobId, body, status, error]
    );
    return rows[0];
}

// Matches an inbound SMS reply to the driver conversation it belongs to.
// Prefers an active (pending/accepted) job for that customer phone; failing
// that, a job completed within the last week — drivers keep texting the
// customer after the ride ("I'm outside", lost items…) and the customer's
// reply must still land in the app. Cancelled/deleted jobs never match.
export async function findJobForReplyByPhone(phone) {
    const { rows } = await query(
        `SELECT * FROM dispatch_jobs
         WHERE deleted_at IS NULL
           AND ${LAST10_SQL('customer_phone')} = RIGHT(regexp_replace($1, '\\D', '', 'g'), 10)
           AND (status IN ('pending', 'accepted')
                OR (status = 'completed' AND updated_at > now() - interval '7 days'))
         ORDER BY (status IN ('pending', 'accepted')) DESC, updated_at DESC
         LIMIT 1`,
        [phone]
    );
    return rows[0] || null;
}

// ---- Conversations by phone number, no job ------------------------------
// A driver texts any customer by typing their number; rows have
// dispatch_job_id NULL and carry the driver + the customer's number instead.

export async function listPhoneMessages(driverId, phone) {
    const { rows } = await query(
        `SELECT * FROM job_messages
         WHERE dispatch_job_id IS NULL AND driver_id = $1 AND ${LAST10_SQL('customer_phone')} = $2
         ORDER BY created_at`,
        [driverId, last10Digits(phone)]
    );
    return rows;
}

export async function deletePhoneMessages(driverId, phone) {
    await query(
        `DELETE FROM job_messages
         WHERE dispatch_job_id IS NULL AND driver_id = $1 AND ${LAST10_SQL('customer_phone')} = $2`,
        [driverId, last10Digits(phone)]
    );
}

export async function createOutboundPhoneMessage(driverId, phone, body, status = 'sent', error = null) {
    const { rows } = await query(
        `INSERT INTO job_messages (driver_id, customer_phone, direction, body, status, error)
         VALUES ($1, $2, 'outbound', $3, $4, $5) RETURNING *`,
        [driverId, phone, body, status, error]
    );
    return rows[0];
}

// The driver who most recently wrote to this number (within a week), i.e. who
// a reply from that number should go to when no job claims it.
export async function findRecentPhoneConversation(phone) {
    const { rows } = await query(
        `SELECT driver_id, created_at FROM job_messages
         WHERE dispatch_job_id IS NULL AND driver_id IS NOT NULL
           AND ${LAST10_SQL('customer_phone')} = $1
           AND created_at > now() - interval '7 days'
         ORDER BY created_at DESC LIMIT 1`,
        [last10Digits(phone)]
    );
    return rows[0] || null;
}

// ---- Inbound replies ----------------------------------------------------

// Stores a customer's reply unless the same text was already stored for this
// conversation in the last few minutes — SMS Gate delivers a webhook once per
// registered webhook (and retries), so one real reply can arrive several
// times, in parallel. The advisory lock makes the check-then-insert atomic
// per conversation; without it, simultaneous deliveries would all pass the
// check. `target` is { jobId } for a job conversation or { driverId, phone }
// for a phone conversation. Returns the new row, or null for a duplicate.
export async function createInboundMessageOnce(target, body, windowSeconds = 180) {
    const isJob = target.jobId != null;
    const lockKey = isJob ? `job:${target.jobId}` : `phone:${target.driverId}:${last10Digits(target.phone)}`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);

        const dup = isJob
            ? await client.query(
                `SELECT 1 FROM job_messages
                 WHERE dispatch_job_id = $1 AND direction = 'inbound' AND body = $2
                   AND created_at > now() - make_interval(secs => $3) LIMIT 1`,
                [target.jobId, body, windowSeconds]
            )
            : await client.query(
                `SELECT 1 FROM job_messages
                 WHERE dispatch_job_id IS NULL AND driver_id = $1 AND ${LAST10_SQL('customer_phone')} = $2
                   AND direction = 'inbound' AND body = $3
                   AND created_at > now() - make_interval(secs => $4) LIMIT 1`,
                [target.driverId, last10Digits(target.phone), body, windowSeconds]
            );

        let row = null;
        if (dup.rows.length === 0) {
            const inserted = isJob
                ? await client.query(
                    `INSERT INTO job_messages (dispatch_job_id, direction, body, status)
                     VALUES ($1, 'inbound', $2, 'received') RETURNING *`,
                    [target.jobId, body]
                )
                : await client.query(
                    `INSERT INTO job_messages (driver_id, customer_phone, direction, body, status)
                     VALUES ($1, $2, 'inbound', $3, 'received') RETURNING *`,
                    [target.driverId, target.phone, body]
                );
            row = inserted.rows[0];
        }
        await client.query('COMMIT');
        return row;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}
