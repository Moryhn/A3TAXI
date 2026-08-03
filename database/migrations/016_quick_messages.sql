-- Four admin-configurable one-tap messages a driver can text a customer
-- (thank-you + Google review link). Fixed at 4 rows, edited in place — the
-- driver UI is a row of 4 buttons, not an arbitrary list.
CREATE TABLE IF NOT EXISTS quick_message_buttons (
    id SERIAL PRIMARY KEY,
    position INTEGER NOT NULL UNIQUE CHECK (position BETWEEN 1 AND 4),
    label VARCHAR(50) NOT NULL DEFAULT '',
    message_template TEXT NOT NULL DEFAULT '',
    google_review_link VARCHAR(500) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO quick_message_buttons (position)
VALUES (1), (2), (3), (4)
ON CONFLICT (position) DO NOTHING;

-- dispatch_job_id is nullable on purpose: drivers also pick up rides outside
-- the app (direct calls, regulars), so sending is never gated on a job
-- existing. Label and final text are snapshotted rather than joined, so the
-- history stays readable after a button is reconfigured.
CREATE TABLE IF NOT EXISTS quick_message_logs (
    id SERIAL PRIMARY KEY,
    dispatch_job_id INTEGER REFERENCES dispatch_jobs(id),
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    button_position INTEGER NOT NULL,
    button_label VARCHAR(50) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    message_sent TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
    error TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_message_logs_job ON quick_message_logs(dispatch_job_id);
