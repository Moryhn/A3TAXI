-- Free-text note a client can leave when booking (e.g. "3 grosses valises",
-- "appeler en arrivant") — surfaced to the admin alongside the reservation,
-- not shown to the driver anywhere in particular yet.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS notes TEXT;
