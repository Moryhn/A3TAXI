-- Monthly membership dues per driver + a ledger to track charges/payments
-- toward what each driver owes the company.
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS monthly_dues NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS driver_ledger_entries (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('charge', 'payment')),
  amount NUMERIC(10,2) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_ledger_entries_driver_id ON driver_ledger_entries(driver_id);
