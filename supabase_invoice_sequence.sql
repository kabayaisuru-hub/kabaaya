-- professional Invoice Numbering System
-- 1. Create a sequence starting at 1500
CREATE SEQUENCE IF NOT EXISTS booking_invoice_seq START 1500;

-- 2. Add the invoice_no column if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_no INTEGER DEFAULT nextval('booking_invoice_seq');

-- 3. If the column existed but was not sequential, we can sync it (Optional for existing data)
-- SELECT setval('booking_invoice_seq', COALESCE((SELECT MAX(invoice_no) FROM bookings), 1500));
