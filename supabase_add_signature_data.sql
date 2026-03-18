-- Migration: Add signature_data for JSON/Points data
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS signature_data TEXT;
