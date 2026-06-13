-- Step 1: Temporarily allow anon inserts (run in Supabase SQL Editor)
-- This is safe because the dedupe_key constraint prevents duplicates

CREATE POLICY "temp_anon_import" ON public.collection_transactions
  FOR INSERT TO anon
  WITH CHECK (source_type = 'import');

-- After running the import script, remove this policy:
-- DROP POLICY "temp_anon_import" ON public.collection_transactions;
