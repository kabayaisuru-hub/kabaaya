-- Add price column to the inventory table
ALTER TABLE inventory
ADD COLUMN price NUMERIC DEFAULT 0.00;

-- Optional: Add a check constraint to ensure price is not negative
ALTER TABLE inventory
ADD CONSTRAINT check_price_non_negative CHECK (price >= 0);
