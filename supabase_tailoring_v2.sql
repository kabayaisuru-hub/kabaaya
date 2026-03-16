-- Migration: Create tailoring_orders and tailoring_items for multi-item job cards

-- 1. Create tailoring_orders table
CREATE TABLE IF NOT EXISTS tailoring_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT UNIQUE NOT NULL, -- Manual ID e.g., KT-2000
    cr_book_page_number TEXT,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_phone TEXT,
    total_amount NUMERIC DEFAULT 0,
    advance_paid NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Measuring', 'Sewing', 'Ready', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create tailoring_items table (Job Card Items)
CREATE TABLE IF NOT EXISTS tailoring_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES tailoring_orders(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL, 
    fabric_source TEXT CHECK (fabric_source IN ('Shop Stock', 'Customer Provided')),
    inventory_item_id UUID REFERENCES inventory(id),
    quantity_used NUMERIC DEFAULT 0,
    fabric_rate NUMERIC DEFAULT 0,
    total_fabric_cost NUMERIC DEFAULT 0,
    stitching_price NUMERIC DEFAULT 0,
    item_total NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS and Policies
ALTER TABLE tailoring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailoring_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tailoring_orders' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON tailoring_orders FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tailoring_items' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON tailoring_items FOR ALL USING (true);
    END IF;
END $$;
