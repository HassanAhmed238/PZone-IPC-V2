-- ============================================================
-- PZone Unified — Module Tables Migration
-- Created: 2026-05-25
-- ============================================================

-- 1. INVOICES (IPC Payment Certificates)
-- Matches the PZone Invoices spreadsheet structure exactly (28 columns)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL,
  sector TEXT,
  submitted_date DATE,
  project_name TEXT NOT NULL,
  client TEXT,
  contract_value NUMERIC(15,2) DEFAULT 0,
  invoice_number TEXT,

  -- Submitted amounts (مستخلص تحت الإعتماد)
  work_previous NUMERIC(15,2) DEFAULT 0,
  work_current NUMERIC(15,2) DEFAULT 0,
  work_total NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  net_previous NUMERIC(15,2) DEFAULT 0,
  net_current NUMERIC(15,2) DEFAULT 0,
  net_total NUMERIC(15,2) DEFAULT 0,

  -- Client approved amounts (مستخلص معتمد من العميل)
  approved_previous NUMERIC(15,2) DEFAULT 0,
  approved_current NUMERIC(15,2) DEFAULT 0,
  approved_total NUMERIC(15,2) DEFAULT 0,
  approved_deductions NUMERIC(15,2) DEFAULT 0,
  approved_net_previous NUMERIC(15,2) DEFAULT 0,
  approved_net_current NUMERIC(15,2) DEFAULT 0,
  approved_net_total NUMERIC(15,2) DEFAULT 0,

  -- Status & tracking
  status TEXT DEFAULT 'تحت الاعتماد'
    CHECK (status IN ('معتمد', 'تحت الاعتماد', 'جارى المراجعه للتقديم', 'ختامى')),
  approval_date DATE,
  contract_percentage NUMERIC(7,4) DEFAULT 0,

  -- Financial summary
  total_collections NUMERIC(15,2) DEFAULT 0,
  unbilled NUMERIC(15,2) DEFAULT 0,
  expected_collection NUMERIC(15,2) DEFAULT 0,

  -- Relations
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_project_code ON invoices(project_code);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client);
CREATE INDEX IF NOT EXISTS idx_invoices_sector ON invoices(sector);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoices_updated_at();


-- 2. BASELINES (Project Schedule)
CREATE TABLE IF NOT EXISTS baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_duration_days INTEGER,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'superseded')),
  approved_by UUID REFERENCES auth.users(id),
  approved_date TIMESTAMPTZ,
  activities JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_baselines" ON baselines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_baselines" ON baselines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_baselines" ON baselines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_baselines" ON baselines FOR DELETE TO authenticated USING (true);


-- 3. PROGRESS UPDATES
CREATE TABLE IF NOT EXISTS progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID REFERENCES baselines(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  overall_progress_pct NUMERIC(5,2) DEFAULT 0,
  planned_progress_pct NUMERIC(5,2) DEFAULT 0,
  variance_pct NUMERIC(5,2) DEFAULT 0,
  weather_days_lost INTEGER DEFAULT 0,
  notes TEXT,
  site_conditions TEXT,
  activities_completed JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_progress" ON progress_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_progress" ON progress_updates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_progress" ON progress_updates FOR UPDATE TO authenticated USING (true);


-- 4. ALARMS
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('overdue', 'deadline', 'milestone', 'financial', 'risk', 'custom')),
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_alarms" ON alarms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_alarms" ON alarms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_alarms" ON alarms FOR UPDATE TO authenticated USING (true);
