-- 1. Create a SQL Sequence starting at 1900
CREATE SEQUENCE IF NOT EXISTS tailoring_order_seq START 1900;

-- 2. Add item_code to tailoring_items if it doesn't exist
ALTER TABLE tailoring_items ADD COLUMN IF NOT EXISTS item_code TEXT;

-- 3. Modify tailoring_orders.invoice_id to have a dynamic default value
-- First, ensure the column exists (it should)
ALTER TABLE tailoring_orders ALTER COLUMN invoice_id SET DEFAULT ('KT-' || nextval('tailoring_order_seq')::text);

-- Optional: If you want to backfill or ensure current data doesn't conflict, but for now 
-- we just set the default for future inserts.
