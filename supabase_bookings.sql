-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_nic TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL,
    advance_paid NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'PickedUp', 'Returned', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching and filtering bookings
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_dates ON bookings (pickup_date, return_date);
CREATE INDEX idx_bookings_item_id ON bookings (item_id);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policy (for development)
CREATE POLICY "Public Access" ON bookings FOR ALL USING (true);
