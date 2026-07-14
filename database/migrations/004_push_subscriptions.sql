-- Web Push subscriptions, one row per browser/device a driver has enabled
-- notifications on, so a dispatched job can wake their phone even when the
-- app is closed or the screen is off.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    endpoint VARCHAR(500) UNIQUE NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_driver ON push_subscriptions(driver_id);
