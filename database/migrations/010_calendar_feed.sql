-- Persistent unguessable token per admin, used for the read-only iCalendar
-- (.ics) feed URL that Outlook/Google Calendar subscribe to. Calendar apps
-- fetch this URL unauthenticated on their own schedule, so the token itself
-- (not a login/JWT) is what gates access — regenerable if it ever leaks.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS calendar_feed_token VARCHAR(64) UNIQUE;
