-- Migration: Add due_date to tailoring_orders
ALTER TABLE tailoring_orders ADD COLUMN due_date DATE;
