-- Migration V6: Add measurement_unit field to tailoring_items
-- This supports Meters (m) and Yards (yd) per item for stock deduction and reference

ALTER TABLE tailoring_items 
  ADD COLUMN IF NOT EXISTS measurement_unit TEXT DEFAULT 'm' 
  CHECK (measurement_unit IN ('m', 'yd'));
