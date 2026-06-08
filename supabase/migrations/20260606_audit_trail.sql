-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  Audit Trail Migration — PZone IPC V2                       ║
-- ║  Automatic change logging for financial tables               ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ─── 1. Create audit_log table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT
);

-- Index for fast lookup by table + record
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log (changed_by);

-- RLS: only admins can read audit logs, system can write
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_select_admin'
  ) THEN
    CREATE POLICY audit_log_select_admin ON public.audit_log
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'chairman')
        )
      );
  END IF;
END $$;

-- ─── 2. Generic audit trigger function ────────────────────────

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if something actually changed
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
      VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Attach audit triggers to financial tables ─────────────

-- Invoices (the most critical table)
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Collection transactions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_transactions') THEN
    DROP TRIGGER IF EXISTS trg_audit_collection_transactions ON public.collection_transactions;
    CREATE TRIGGER trg_audit_collection_transactions
      AFTER INSERT OR UPDATE OR DELETE ON public.collection_transactions
      FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
  END IF;
END $$;

-- Cash flow transactions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_flow_transactions') THEN
    DROP TRIGGER IF EXISTS trg_audit_cash_flow_transactions ON public.cash_flow_transactions;
    CREATE TRIGGER trg_audit_cash_flow_transactions
      AFTER INSERT OR UPDATE OR DELETE ON public.cash_flow_transactions
      FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
  END IF;
END $$;

-- ─── 4. Cleanup policy: auto-delete audit logs older than 1 year ──

-- Note: Run this periodically or set up a pg_cron job:
-- DELETE FROM public.audit_log WHERE changed_at < now() - INTERVAL '1 year';
