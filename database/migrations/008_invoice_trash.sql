-- Soft-delete support for invoices, matching the trash/restore pattern
-- already used for trips, reservations, dispatch jobs, drivers, and client
-- accounts.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
