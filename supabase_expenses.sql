-- Migration: Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('Vehicle', 'Petrol', 'Shop Rent', 'Tea/Meals', 'Light Bill', 'Water Bill', 'Other')),
    amount NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Public Access Policy
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON expenses FOR ALL USING (true);
    END IF;
END $$;
