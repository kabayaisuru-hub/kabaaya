-- Migration: Add item_code to tailoring_items
ALTER TABLE tailoring_items ADD COLUMN IF NOT EXISTS item_code TEXT;
