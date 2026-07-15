-- Reservations dispatched to a driver ahead of time (e.g. an airport pickup
-- booked for tomorrow) shouldn't text the customer "your driver is on the
-- way" the moment the driver accepts, hours or days early. scheduled_time
-- carries the reservation's requested_time so the SMS can instead be held
-- until close to pickup; tracking_sms_sent guards against sending it twice
-- (once from the immediate-accept path, once from the scheduled sweep).
ALTER TABLE dispatch_jobs
  ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_sms_sent BOOLEAN NOT NULL DEFAULT false;
