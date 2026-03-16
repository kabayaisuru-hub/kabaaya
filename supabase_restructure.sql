-- Drop existing table if it exists to ensure a clean start
DROP TABLE IF EXISTS inventory;

-- Create restructured inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('Blazer', 'Fabric', 'Product')),
    item_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    size TEXT,           -- Applicable for Blazers and Products
    color TEXT,          -- Applicable for Blazers
    fabric_type TEXT,    -- Applicable for Fabric only
    unit TEXT CHECK (unit IN ('Meters', 'Yards', 'Pcs')),  -- Applicable for Fabric ('Meters'/'Yards') and Products ('Pcs')
    quantity NUMERIC DEFAULT 0,  -- Applicable for Fabric and Products
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Rented', 'Sold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint Logic for Item Codes:
    -- Blazers: B-
    -- Fabric: F-
    -- Product: P-
    CONSTRAINT check_item_code_prefix CHECK (
        (category = 'Blazer' AND item_code LIKE 'B-%') OR
        (category = 'Fabric' AND item_code LIKE 'F-%') OR
        (category = 'Product' AND item_code LIKE 'P-%')
    )
);

-- Index for searching
CREATE INDEX idx_inventory_category_search ON inventory (category, item_code, name);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policy
CREATE POLICY "Public Access" ON inventory FOR ALL USING (true);
