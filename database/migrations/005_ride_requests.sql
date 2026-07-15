-- "Book now" public ride requests: a dispatch job created by a customer
-- directly, unassigned until an admin picks a driver from the incoming
-- requests queue.
ALTER TABLE dispatch_jobs ALTER COLUMN driver_id DROP NOT NULL;
ALTER TABLE dispatch_jobs
  ADD COLUMN IF NOT EXISTS dropoff_location VARCHAR(500),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10,2);

-- Informational-only destination category for the scheduled booking form
-- (local / airport / Montreal / long distance) — never affects pricing.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS destination_category VARCHAR(20) NOT NULL DEFAULT 'local';
