-- ============================================================
-- IPC Standalone System — Migration
-- Run this in Supabase SQL Editor (once)
-- ============================================================

-- 1. Project Master Data Table
CREATE TABLE IF NOT EXISTS ipc_projects (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code      text UNIQUE NOT NULL,
  project_name      text NOT NULL,
  client            text,
  sector            text,
  project_manager   text,
  contract_value    numeric(18,2) DEFAULT 0,
  start_date        date,
  end_date          date,
  location          text,
  description       text,
  variation_orders  jsonb DEFAULT '[]'::jsonb,  -- [{vo_number, description, amount, status}]
  is_active         boolean DEFAULT true,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE ipc_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated can read ipc_projects" ON ipc_projects;
DROP POLICY IF EXISTS "authenticated can write ipc_projects" ON ipc_projects;
CREATE POLICY "authenticated can read ipc_projects"
  ON ipc_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated can write ipc_projects"
  ON ipc_projects FOR ALL USING (auth.role() = 'authenticated');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ipc_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ipc_projects_updated_at ON ipc_projects;
CREATE TRIGGER trg_ipc_projects_updated_at
  BEFORE UPDATE ON ipc_projects
  FOR EACH ROW EXECUTE FUNCTION update_ipc_projects_updated_at();

-- 2. Add new columns to ipc_invoices (if not exist)
ALTER TABLE ipc_invoices
  ADD COLUMN IF NOT EXISTS tax_type            text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS tax_amount          numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_direction       text DEFAULT 'added',  -- 'added' or 'withheld'
  ADD COLUMN IF NOT EXISTS approved_tax_type   text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS approved_tax_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_tax_direction text DEFAULT 'added',
  ADD COLUMN IF NOT EXISTS share_token         text UNIQUE,
  ADD COLUMN IF NOT EXISTS approval_date       date,
  ADD COLUMN IF NOT EXISTS collection_date     date,
  ADD COLUMN IF NOT EXISTS ipc_project_id      uuid REFERENCES ipc_projects(id) ON DELETE SET NULL;

-- Index for share_token lookups
CREATE INDEX IF NOT EXISTS idx_ipc_invoices_share_token ON ipc_invoices(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ipc_invoices_project_code ON ipc_invoices(project_code);
