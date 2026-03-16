-- Migration: item_id (UUID) -> item_ids (UUID Array)
-- This allows a single booking to reference multiple inventory items.

-- 1. Add the new array column
ALTER TABLE bookings ADD COLUMN item_ids UUID[] DEFAULT '{}';

-- 2. Migrate existing data
UPDATE bookings SET item_ids = ARRAY[item_id] WHERE item_id IS NOT NULL;

-- 3. Update the foreign key constraint (Optional but recommended)
-- Note: Foreign keys on arrays are complex in Postgres. Usually handled via application logic or join tables.
-- For this simple app, we will rely on application-level integrity.

-- 4. Drop the old column
ALTER TABLE bookings DROP COLUMN item_id;

-- 5. Update index for array searches
CREATE INDEX idx_bookings_item_ids ON bookings USING GIN (item_ids);
