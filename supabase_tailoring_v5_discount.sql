-- Migration: Add discount fields to tailoring_orders
ALTER TABLE tailoring_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE tailoring_orders ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE tailoring_orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;
