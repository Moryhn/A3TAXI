-- Fil de conversation par course : lignes sortantes (chauffeur → client,
-- texte libre, via le bouton "Communiquer avec le client") et entrantes
-- (réponse du client, livrée par le webhook sms:received de SMS Gate).
-- Même convention que quick_message_logs (dispatch_job_id, status sent/failed).
CREATE TABLE job_messages (
    id SERIAL PRIMARY KEY,
    dispatch_job_id INTEGER REFERENCES dispatch_jobs(id),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'received')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_messages_job ON job_messages(dispatch_job_id, created_at);
