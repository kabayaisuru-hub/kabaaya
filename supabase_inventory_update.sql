-- Migration: Update inventory table for unit-based costing
-- This migration adds unit_cost_price and unit_selling_price columns,
-- and renames quantity to current_stock_quantity.

-- 1. Add new columns
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS unit_cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_selling_price NUMERIC DEFAULT 0;

-- 2. Rename existing quantity column to current_stock_quantity
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'quantity') THEN
        ALTER TABLE inventory RENAME COLUMN quantity TO current_stock_quantity;
    END IF;
END $$;

-- 3. Migrate data from 'price' to 'unit_selling_price' if 'price' exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'price') THEN
        UPDATE inventory SET unit_selling_price = price WHERE unit_selling_price = 0 OR unit_selling_price IS NULL;
        -- We won't drop 'price' yet to avoid breaking the app before code updates are deployed, 
        -- but the code will be updated to use unit_selling_price.
    END IF;
END $$;
