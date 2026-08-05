-- Read-only Outlook -> A3TAXI calendar sync (Microsoft Graph OAuth). The
-- outbound ICS feed (calendar_feed_token) already lets Imad subscribe to
-- A3TAXI reservations from Outlook; this is the opposite direction, so the
-- Reservations page calendar can show his real Outlook events instead.
-- outlook_oauth_state is a short-lived correlation token (same pattern as
-- calendar_feed_token) letting the OAuth callback, which Microsoft calls
-- directly with no session JWT, identify which admin started the flow.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outlook_oauth_state VARCHAR(64);
