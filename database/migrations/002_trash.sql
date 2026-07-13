-- Soft-delete support for the trash bin / restore feature

ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON trips(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reservations_deleted_at ON reservations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_deleted_at ON dispatch_jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_drivers_deleted_at ON drivers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_client_accounts_deleted_at ON client_accounts(deleted_at);
