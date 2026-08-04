import { query } from '../config/db.js';

export async function listButtons() {
    const { rows } = await query('SELECT * FROM quick_message_buttons ORDER BY position');
    return rows;
}

export async function getButton(position) {
    const { rows } = await query('SELECT * FROM quick_message_buttons WHERE position = $1', [position]);
    return rows[0] || null;
}

// Appends past the highest existing position rather than filling gaps left by
// deletions — a position is a button's stable key (drivers may have the list
// open while the admin edits it), so reusing one would silently repoint it.
export async function createButton() {
    const { rows } = await query(
        `INSERT INTO quick_message_buttons (position)
         VALUES ((SELECT COALESCE(MAX(position), 0) + 1 FROM quick_message_buttons))
         RETURNING *`
    );
    return rows[0];
}

export async function deleteButton(position) {
    const { rowCount } = await query('DELETE FROM quick_message_buttons WHERE position = $1', [position]);
    return rowCount > 0;
}

export async function updateButton(position, { label, messageTemplate, googleReviewLink, isActive }) {
    const { rows } = await query(
        `UPDATE quick_message_buttons
         SET label = COALESCE($2, label),
             message_template = COALESCE($3, message_template),
             google_review_link = COALESCE($4, google_review_link),
             is_active = COALESCE($5, is_active),
             updated_at = now()
         WHERE position = $1 RETURNING *`,
        [position, label, messageTemplate, googleReviewLink, isActive]
    );
    return rows[0] || null;
}

export async function createLog({
    dispatchJobId, driverId, buttonPosition, buttonLabel, customerPhone, messageSent, status, error,
}) {
    const { rows } = await query(
        `INSERT INTO quick_message_logs
           (dispatch_job_id, driver_id, button_position, button_label, customer_phone, message_sent, status, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [dispatchJobId, driverId, buttonPosition, buttonLabel, customerPhone, messageSent, status, error]
    );
    return rows[0];
}

export async function listLogs() {
    const { rows } = await query(
        `SELECT l.*, d.name AS driver_name, j.address AS job_address
         FROM quick_message_logs l
         JOIN drivers d ON d.id = l.driver_id
         LEFT JOIN dispatch_jobs j ON j.id = l.dispatch_job_id
         ORDER BY l.sent_at DESC LIMIT 200`
    );
    return rows;
}
