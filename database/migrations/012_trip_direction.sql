-- Whether a trip was one-way, a return only, or a round trip.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS direction VARCHAR(20) NOT NULL DEFAULT 'aller'
    CHECK (direction IN ('aller', 'retour', 'aller_retour'));
