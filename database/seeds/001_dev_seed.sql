-- Dev-only seed data. Do not run in production.

-- Default admin: email admin@a3taxi.local / password set via backend seed script (password hashed there),
-- so this file only seeds non-sensitive reference data.

INSERT INTO client_accounts (name, code, contact_name, contact_email, contact_phone) VALUES
    ('DHL', 'DHL', 'Jane Doe', 'jane@dhl.example', '555-0100'),
    ('Acme Logistics', 'ACME', 'John Smith', 'john@acme.example', '555-0101');

INSERT INTO drivers (name, phone, access_code) VALUES
    ('Mo Ryhn', '555-0200', 'DRV-1001'),
    ('Sam Lee', '555-0201', 'DRV-1002');
