-- Once an invoice has been sent to the client, admin can finalize it so it
-- stops changing: no more editing, and Generate starts a fresh invoice
-- instead of quietly adding new trips to it.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
