-- Airport bookings need info a regular ride doesn't: which vehicle size to
-- send (car vs minivan), and — when the client also wants the return leg
-- picked up straight from the airport — the flight they're landing on,
-- since a scheduled guess is useless once the flight is early/delayed.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS return_flight_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS return_arrival_time TIMESTAMPTZ;
