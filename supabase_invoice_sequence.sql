-- Professional Invoice Numbering System
-- 1. Create a sequence starting at 1500
CREATE SEQUENCE IF NOT EXISTS booking_invoice_seq START 1500;

-- 2. Add the invoice_no column if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_no INTEGER DEFAULT nextval('booking_invoice_seq');

-- 3. Backfill existing records if they have null invoice_no
UPDATE bookings SET invoice_no = nextval('booking_invoice_seq') WHERE invoice_no IS NULL;

-- 4. Sync the sequence to the current max to prevent collisions
SELECT setval('booking_invoice_seq', GREATEST((SELECT MAX(invoice_no) FROM bookings), 1500));
