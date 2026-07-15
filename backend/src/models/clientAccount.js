import { query } from '../config/db.js';

export async function listClientAccounts({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE is_active = true AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
    const { rows } = await query(`SELECT * FROM client_accounts ${where} ORDER BY name`);
    return rows;
}

export async function findClientAccountById(id) {
    const { rows } = await query('SELECT * FROM client_accounts WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function createClientAccount({
    name, code, contactName, contactEmail, contactPhone,
    address, city, postalCode, invoiceDescription,
}) {
    const { rows } = await query(
        `INSERT INTO client_accounts (name, code, contact_name, contact_email, contact_phone, address, city, postal_code, invoice_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, code, contactName, contactEmail, contactPhone, address, city, postalCode, invoiceDescription]
    );
    return rows[0];
}

export async function updateClientAccount(id, {
    name, contactName, contactEmail, contactPhone, isActive,
    address, city, postalCode, invoiceDescription,
}) {
    const { rows } = await query(
        `UPDATE client_accounts
         SET name = COALESCE($2, name),
             contact_name = COALESCE($3, contact_name),
             contact_email = COALESCE($4, contact_email),
             contact_phone = COALESCE($5, contact_phone),
             is_active = COALESCE($6, is_active),
             address = COALESCE($7, address),
             city = COALESCE($8, city),
             postal_code = COALESCE($9, postal_code),
             invoice_description = COALESCE($10, invoice_description)
         WHERE id = $1 RETURNING *`,
        [id, name, contactName, contactEmail, contactPhone, isActive, address, city, postalCode, invoiceDescription]
    );
    return rows[0] || null;
}

export async function deleteClientAccount(id) {
    const { rows } = await query(
        'UPDATE client_accounts SET deleted_at = now(), is_active = false WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0] || null;
}

export async function restoreClientAccount(id) {
    const { rows } = await query(
        'UPDATE client_accounts SET deleted_at = NULL, is_active = true WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0] || null;
}

export async function permanentlyDeleteClientAccount(id) {
    await query('DELETE FROM client_accounts WHERE id = $1', [id]);
}

export async function listDeletedClientAccounts() {
    const { rows } = await query('SELECT * FROM client_accounts WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    return rows;
}
