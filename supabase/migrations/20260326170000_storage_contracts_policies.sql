-- Allow authenticated users to download (select) from contracts bucket
CREATE POLICY "Allow authenticated downloads" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'contracts');

-- Allow authenticated users to upload to contracts bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contracts');

-- Allow authenticated users to update files in contracts bucket
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contracts');

-- Allow authenticated users to delete files from contracts bucket
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'contracts');
