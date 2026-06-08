-- ======================================================================
-- PZone Contract Administration System — Complete Schema Migration
-- Run this ONCE in Supabase Dashboard SQL Editor
-- ======================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Contract IPCs (Interim Payment Certificates)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_ipcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ongoing_projects(id),
  ipc_number INTEGER NOT NULL,
  period_from DATE,
  period_to DATE,
  submission_date DATE,
  approval_date DATE,
  status TEXT DEFAULT 'draft',
  previous_cumulative NUMERIC(15,2) DEFAULT 0,
  current_work_done NUMERIC(15,2) DEFAULT 0,
  cumulative_value NUMERIC(15,2) DEFAULT 0,
  retention_deduction NUMERIC(15,2) DEFAULT 0,
  advance_recovery NUMERIC(15,2) DEFAULT 0,
  other_deductions NUMERIC(15,2) DEFAULT 0,
  net_payable NUMERIC(15,2) DEFAULT 0,
  completion_pct NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, ipc_number)
);

CREATE TABLE IF NOT EXISTS contract_ipc_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipc_id UUID NOT NULL REFERENCES contract_ipcs(id) ON DELETE CASCADE,
  boq_item_ref TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  contract_qty NUMERIC(15,3),
  contract_rate NUMERIC(15,2),
  previous_qty NUMERIC(15,3) DEFAULT 0,
  current_qty NUMERIC(15,3) DEFAULT 0,
  cumulative_qty NUMERIC(15,3) DEFAULT 0,
  amount NUMERIC(15,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 2. Schedule Baselines & Activities
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  approved_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES schedule_baselines(id) ON DELETE CASCADE,
  activity_id TEXT,
  activity_name TEXT NOT NULL,
  parent_id UUID REFERENCES schedule_activities(id),
  planned_start DATE,
  planned_finish DATE,
  actual_start DATE,
  actual_finish DATE,
  planned_duration INTEGER,
  actual_duration INTEGER,
  weight_pct NUMERIC(5,2) DEFAULT 0,
  planned_pct NUMERIC(5,2) DEFAULT 0,
  actual_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'not_started',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 3. Contract Alarms
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL,
  trigger_days_before INTEGER DEFAULT 7,
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  notify_roles TEXT[] DEFAULT '{"contract_admin", "project_manager"}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 4. Project Notebooks (NotebookLM Mapping)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  notebook_id TEXT NOT NULL,
  notebook_title TEXT,
  source_type TEXT DEFAULT 'contract',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notebook_id)
);

-- ──────────────────────────────────────────────────────────────────────
-- 5. Role Matrix & Module Access (seed data)
-- ──────────────────────────────────────────────────────────────────────

-- Add new roles if the enum exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'contract_admin'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ipc_clerk'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'scheduler'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'board_member'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- Seed module access if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_module_access') THEN
    INSERT INTO contract_module_access (module_path, module_label, role) VALUES
      ('/board-dashboard', 'Board Dashboard', 'chairman'),
      ('/board-dashboard', 'Board Dashboard', 'ceo'),
      ('/board-dashboard', 'Board Dashboard', 'board_member'),
      ('/contracts', 'Contracts Hub', 'contract_admin'),
      ('/contracts', 'Contracts Hub', 'ipc_clerk'),
      ('/contracts', 'Contracts Hub', 'scheduler'),
      ('/invoices', 'IPC Log', 'ipc_clerk'),
      ('/invoices', 'IPC Log', 'finance'),
      ('/site-progress', 'Site Progress', 'scheduler'),
      ('/site-progress', 'Site Progress', 'site_engineer')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- 6. Performance Indexes
-- ──────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contract_ipcs_contract_id ON contract_ipcs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_ipcs_status ON contract_ipcs(status);
CREATE INDEX IF NOT EXISTS idx_contract_ipc_lines_ipc_id ON contract_ipc_lines(ipc_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_baseline_id ON schedule_activities(baseline_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_status ON schedule_activities(status);
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_contract_id ON schedule_baselines(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_alarms_contract_id ON contract_alarms(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_alarms_active ON contract_alarms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_notebooks_contract_id ON project_notebooks(contract_id);
CREATE INDEX IF NOT EXISTS idx_project_notebooks_project_id ON project_notebooks(project_id);

-- ──────────────────────────────────────────────────────────────────────
-- 7. Row Level Security (RLS)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE contract_ipcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_ipc_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notebooks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (refine per-role later)
CREATE POLICY "Authenticated users can manage IPCs"
  ON contract_ipcs FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage IPC lines"
  ON contract_ipc_lines FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage baselines"
  ON schedule_baselines FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage activities"
  ON schedule_activities FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage alarms"
  ON contract_alarms FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage notebooks"
  ON project_notebooks FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- DONE! All tables, indexes, RLS policies, and seed data are ready.
-- ──────────────────────────────────────────────────────────────────────
