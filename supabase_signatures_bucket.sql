-- 1. Create a public storage bucket named 'signatures'
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to view/download signatures (SELECT)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'signatures');

-- 3. Allow authenticated users to upload signatures (INSERT)
-- Since your app uses anonymous/public bookings right now, we will allow inserts.
CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'signatures');

-- 4. Allow users to update their own signatures (UPDATE)
CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'signatures');

-- 5. Allow users to delete their own signatures (DELETE)
CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'signatures');
