-- Archive table: stores old versions of collection_transactions before updates
-- Automatic via trigger — no app code changes needed

CREATE TABLE IF NOT EXISTS public.collection_transactions_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Original row data (mirror of collection_transactions)
  original_id uuid NOT NULL,
  project_code text NOT NULL,
  project_name text,
  invoice_id uuid,
  invoice_number text,
  client text,
  collection_date date NOT NULL,
  collection_month date NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  reference_no text,
  bank_account text,
  notes text,
  source_type text NOT NULL,
  source_file_name text,
  source_row_key text,
  dedupe_key text NOT NULL,
  status text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  -- Archive metadata
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_reason text NOT NULL DEFAULT 'update',  -- 'update', 'delete', 'sync_overwrite'
  archived_by text  -- who triggered the change (sync, manual, etc.)
);

CREATE INDEX IF NOT EXISTS idx_collection_history_original_id
  ON public.collection_transactions_history(original_id);
CREATE INDEX IF NOT EXISTS idx_collection_history_project_code
  ON public.collection_transactions_history(project_code);
CREATE INDEX IF NOT EXISTS idx_collection_history_archived_at
  ON public.collection_transactions_history(archived_at);

-- Trigger function: copies old row to history before UPDATE
CREATE OR REPLACE FUNCTION public.archive_collection_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only archive if the amount or status actually changed
  IF OLD.amount IS DISTINCT FROM NEW.amount 
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.collection_date IS DISTINCT FROM NEW.collection_date THEN
    INSERT INTO public.collection_transactions_history (
      original_id, project_code, project_name, invoice_id, invoice_number,
      client, collection_date, collection_month, amount, currency,
      reference_no, bank_account, notes, source_type, source_file_name,
      source_row_key, dedupe_key, status, created_by, created_at, updated_at,
      archive_reason, archived_by
    ) VALUES (
      OLD.id, OLD.project_code, OLD.project_name, OLD.invoice_id, OLD.invoice_number,
      OLD.client, OLD.collection_date, OLD.collection_month, OLD.amount, OLD.currency,
      OLD.reference_no, OLD.bank_account, OLD.notes, OLD.source_type, OLD.source_file_name,
      OLD.source_row_key, OLD.dedupe_key, OLD.status, OLD.created_by, OLD.created_at, OLD.updated_at,
      'update', COALESCE(NEW.source_type, 'unknown')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: copies old row to history before DELETE
CREATE OR REPLACE FUNCTION public.archive_collection_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.collection_transactions_history (
    original_id, project_code, project_name, invoice_id, invoice_number,
    client, collection_date, collection_month, amount, currency,
    reference_no, bank_account, notes, source_type, source_file_name,
    source_row_key, dedupe_key, status, created_by, created_at, updated_at,
    archive_reason, archived_by
  ) VALUES (
    OLD.id, OLD.project_code, OLD.project_name, OLD.invoice_id, OLD.invoice_number,
    OLD.client, OLD.collection_date, OLD.collection_month, OLD.amount, OLD.currency,
    OLD.reference_no, OLD.bank_account, OLD.notes, OLD.source_type, OLD.source_file_name,
    OLD.source_row_key, OLD.dedupe_key, OLD.status, OLD.created_by, OLD.created_at, OLD.updated_at,
    'delete', 'manual'
  );
  RETURN OLD;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_archive_collection_update ON public.collection_transactions;
CREATE TRIGGER trg_archive_collection_update
  BEFORE UPDATE ON public.collection_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_collection_before_update();

DROP TRIGGER IF EXISTS trg_archive_collection_delete ON public.collection_transactions;
CREATE TRIGGER trg_archive_collection_delete
  BEFORE DELETE ON public.collection_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_collection_before_delete();

-- RLS: same read policy as main table
ALTER TABLE public.collection_transactions_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_read" ON public.collection_transactions_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "history_write" ON public.collection_transactions_history
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'finance')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'finance')
  );
