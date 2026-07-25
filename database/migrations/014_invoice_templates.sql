-- Per-client Excel invoice templates. field_mapping declares which cells the
-- generator writes into: header fields plus a repeating trip-row region.
CREATE TABLE IF NOT EXISTS invoice_templates (
  id SERIAL PRIMARY KEY,
  client_account_id INTEGER NOT NULL REFERENCES client_accounts(id),
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  field_mapping JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_client ON invoice_templates(client_account_id);

-- Which template (if any) an invoice was generated with, so re-exporting
-- later always uses the same layout it was first produced with.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES invoice_templates(id);
