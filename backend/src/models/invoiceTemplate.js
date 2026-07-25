import { query } from '../config/db.js';

export async function createTemplate({ clientAccountId, name, fileUrl, fieldMapping }) {
    const { rows } = await query(
        `INSERT INTO invoice_templates (client_account_id, name, file_url, field_mapping)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientAccountId, name, fileUrl, JSON.stringify(fieldMapping)]
    );
    return rows[0];
}

// Only one template is "active" per client at a time — uploading a new one
// supersedes the last, rather than requiring the admin to delete it first.
export async function deactivateTemplatesForClient(clientAccountId) {
    await query(
        `UPDATE invoice_templates SET is_active = false WHERE client_account_id = $1 AND deleted_at IS NULL`,
        [clientAccountId]
    );
}

export async function findActiveTemplateForClient(clientAccountId) {
    const { rows } = await query(
        `SELECT * FROM invoice_templates
         WHERE client_account_id = $1 AND is_active = true AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [clientAccountId]
    );
    return rows[0] || null;
}

export async function findTemplateById(id) {
    const { rows } = await query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function listTemplatesForClient(clientAccountId) {
    const { rows } = await query(
        `SELECT * FROM invoice_templates WHERE client_account_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [clientAccountId]
    );
    return rows;
}
