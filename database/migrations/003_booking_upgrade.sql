-- Round trip, passenger/luggage counts, service type (ride/battery_boost/lockout),
-- and price-estimate fields for the upgraded public booking form.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) NOT NULL DEFAULT 'ride',
  ADD COLUMN IF NOT EXISTS passenger_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS carry_on_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checked_luggage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS is_night_rate BOOLEAN,
  ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10,2);

ALTER TABLE reservations ALTER COLUMN dropoff_location DROP NOT NULL;

ALTER TABLE dispatch_jobs
  ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) NOT NULL DEFAULT 'ride';
