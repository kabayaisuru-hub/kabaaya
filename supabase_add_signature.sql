-- Add signature field for PDF receipts
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS signature_url TEXT;
