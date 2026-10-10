-- Conversations par numéro de téléphone, sans course : un chauffeur peut
-- écrire à n'importe quel client (numéro tapé à la main) et discuter comme
-- sur une course. Ces lignes ont dispatch_job_id NULL et sont rattachées au
-- chauffeur + au numéro du client (chiffres comparés sur les 10 derniers,
-- comme pour le rattachement des réponses aux courses).
ALTER TABLE job_messages
  ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_job_messages_phone
  ON job_messages(driver_id, created_at) WHERE dispatch_job_id IS NULL;
