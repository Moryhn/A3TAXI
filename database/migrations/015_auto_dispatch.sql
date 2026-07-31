-- Persistent per-admin toggle: while on, a new "book now" request is
-- assigned to the nearest available driver the instant it's created,
-- instead of waiting in "Demandes entrantes" for a manual pick — meant for
-- when the admin is away and can't click Assign in real time.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS auto_dispatch_enabled BOOLEAN NOT NULL DEFAULT false;
