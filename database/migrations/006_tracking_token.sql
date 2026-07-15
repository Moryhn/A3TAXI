-- Unguessable token for public "track my ride" links, sent by SMS when a
-- driver accepts a job. Never expose sequential dispatch_jobs.id publicly —
-- it would let anyone enumerate other customers' live locations.
ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) UNIQUE;
