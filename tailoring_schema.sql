-- Create tailoring table
CREATE TABLE IF NOT EXISTS tailoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Measuring', 'Sewing', 'Ready', 'Completed')),
    measurements JSONB DEFAULT '{}',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE tailoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON tailoring FOR ALL USING (true);
