-- Drop the fixed four-button limit — the admin wants to add as many
-- quick-message buttons as they need. `position` stays UNIQUE and remains the
-- stable per-button key used by the API and snapshotted into
-- quick_message_logs; it now only orders the list and can grow past 4.
-- Gaps left by a deleted button are fine and never renumbered, so a button's
-- key stays valid for as long as it exists.
ALTER TABLE quick_message_buttons DROP CONSTRAINT IF EXISTS quick_message_buttons_position_check;
