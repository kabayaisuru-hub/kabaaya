-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Blazer', 'Fabric')),
    name TEXT NOT NULL,
    size TEXT, -- nullable, used for Blazers
    color TEXT,
    unit TEXT CHECK (unit IN ('Meters', 'Yards', 'Pcs')),
    quantity NUMERIC DEFAULT 0,
    min_stock_level NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Logic for Item Codes:
    -- Blazers must start with "B-"
    -- Fabrics must start with "F-"
    CONSTRAINT check_item_code_prefix CHECK (
        (category = 'Blazer' AND item_code LIKE 'B-%') OR
        (category = 'Fabric' AND item_code LIKE 'F-%')
    )
);

-- Index for efficient searching by code or name
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory (item_code, name);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing project pattern)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON inventory FOR ALL USING (true);
    END IF;
END $$;
