-- Migration Phase 4: Add notes to tailoring_orders
ALTER TABLE tailoring_orders ADD COLUMN notes TEXT;
