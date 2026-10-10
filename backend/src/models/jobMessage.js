import { query, pool } from '../config/db.js';

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

// Stores a customer's reply unless the same text was already stored for this
// job in the last few minutes — SMS Gate delivers a webhook once per
// registered webhook (and retries), so one real reply can arrive several
// times, in parallel. The advisory lock makes the check-then-insert atomic
// per job; without it, simultaneous deliveries would all pass the check.
// Returns the new row, or null when it was a duplicate.
export async function createInboundMessageOnce(jobId, body, windowSeconds = 180) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [jobId]);
        const dup = await client.query(
            `SELECT 1 FROM job_messages
             WHERE dispatch_job_id = $1 AND direction = 'inbound' AND body = $2
               AND created_at > now() - make_interval(secs => $3)
             LIMIT 1`,
            [jobId, body, windowSeconds]
        );
        let row = null;
        if (dup.rows.length === 0) {
            const inserted = await client.query(
                `INSERT INTO job_messages (dispatch_job_id, direction, body, status)
                 VALUES ($1, 'inbound', $2, 'received') RETURNING *`,
                [jobId, body]
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

// Matches an inbound SMS reply to the driver conversation it belongs to.
// Prefers an active (pending/accepted) job for that customer phone; failing
// that, a job completed within the last week — drivers keep texting the
// customer after the ride ("I'm outside", lost items…) and the customer's
// reply must still land in the app. Cancelled/deleted jobs never match.
// Compares only the last 10 digits of both sides — customer_phone is stored
// however it was typed (dashes, spaces, with or without country code), while
// SMS Gate's webhook sender field has its own format, so an exact string
// match would miss most real replies.
export async function findJobForReplyByPhone(phone) {
    const { rows } = await query(
        `SELECT * FROM dispatch_jobs
         WHERE deleted_at IS NULL
           AND RIGHT(regexp_replace(customer_phone, '\\D', '', 'g'), 10) = RIGHT(regexp_replace($1, '\\D', '', 'g'), 10)
           AND (status IN ('pending', 'accepted')
                OR (status = 'completed' AND updated_at > now() - interval '7 days'))
         ORDER BY (status IN ('pending', 'accepted')) DESC, updated_at DESC
         LIMIT 1`,
        [phone]
    );
    return rows[0] || null;
}
