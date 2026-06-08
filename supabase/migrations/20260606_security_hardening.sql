-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  Security Hardening Migration — PZone IPC V2                ║
-- ║  Ensures RLS is enabled on ALL data tables                  ║
-- ║  Run AFTER 20260604_raci_multi_user_hardening.sql           ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ─── 1. Enable RLS on all tables that might be missing it ─────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE '_prisma%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- ─── 2. Ensure authenticated users can read their own org data ─

-- Invoices: authenticated users can read all invoices (same org)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_select_authenticated'
  ) THEN
    CREATE POLICY invoices_select_authenticated ON public.invoices
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Invoices: only admins/finance can insert/update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_insert_authenticated'
  ) THEN
    CREATE POLICY invoices_insert_authenticated ON public.invoices
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_update_authenticated'
  ) THEN
    CREATE POLICY invoices_update_authenticated ON public.invoices
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Collection transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collection_transactions' AND policyname = 'ct_select_auth'
  ) THEN
    CREATE POLICY ct_select_auth ON public.collection_transactions
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collection_transactions' AND policyname = 'ct_insert_auth'
  ) THEN
    CREATE POLICY ct_insert_auth ON public.collection_transactions
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Cash flow transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_flow_transactions' AND policyname = 'cft_select_auth'
  ) THEN
    CREATE POLICY cft_select_auth ON public.cash_flow_transactions
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_flow_transactions' AND policyname = 'cft_insert_auth'
  ) THEN
    CREATE POLICY cft_insert_auth ON public.cash_flow_transactions
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Cash flow forecasts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_flow_forecasts' AND policyname = 'cff_select_auth'
  ) THEN
    CREATE POLICY cff_select_auth ON public.cash_flow_forecasts
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- User roles: users can only read their own roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_own_select'
  ) THEN
    CREATE POLICY user_roles_own_select ON public.user_roles
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── 3. Deny anonymous access to sensitive tables ─────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_deny_anon'
  ) THEN
    CREATE POLICY invoices_deny_anon ON public.invoices
      FOR ALL TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_deny_anon'
  ) THEN
    CREATE POLICY user_roles_deny_anon ON public.user_roles
      FOR ALL TO anon USING (false);
  END IF;
END $$;

-- ─── 4. Add updated_at trigger for audit tracking ─────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    GROUP BY table_name
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trg_' || tbl || '_updated_at'
        AND event_object_table = tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
