-- Full client billing address + a per-client default line-item description
-- ("Livraison" for a bulk-delivery client like Contrans), needed to print a
-- proper invoice with a bill-to block instead of just the client's name.
ALTER TABLE client_accounts
  ADD COLUMN IF NOT EXISTS address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS invoice_description VARCHAR(255);

-- Admin can hand-enter an invoice number and date at generation time (e.g. to
-- match an existing paper numbering scheme), instead of only auto-generated
-- ones.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_date DATE;
