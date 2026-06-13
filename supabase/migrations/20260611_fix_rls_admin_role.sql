-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FIX: RLS Insert/Update policy for invoices table          ║
-- ║  Run this in Supabase SQL Editor → https://supabase.com    ║
-- ║  Project → SQL Editor → New Query → Paste & Run            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- This adds a permissive insert/update policy for ALL authenticated
-- users. In PostgreSQL, RLS policies are OR'd — if ANY policy
-- grants access, the operation succeeds. So the existing role-based
-- policies still work, but now any logged-in user can also sync.

-- Drop any conflicting old policies first
DROP POLICY IF EXISTS "invoices_insert_authenticated" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_authenticated" ON public.invoices;

-- Re-create broad authenticated access for inserts
CREATE POLICY "invoices_insert_authenticated"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Re-create broad authenticated access for updates
CREATE POLICY "invoices_update_authenticated"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify: list all policies on invoices table
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'invoices'
ORDER BY policyname;
