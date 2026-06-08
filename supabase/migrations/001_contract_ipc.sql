-- ============================================================
-- Migration 001: Contract IPCs (Interim Payment Certificates)
-- Links IPCs directly to contracts with line-item detail
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_ipcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ongoing_projects(id),
  ipc_number INTEGER NOT NULL,
  period_from DATE,
  period_to DATE,
  submission_date DATE,
  approval_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  previous_cumulative NUMERIC(15,2) DEFAULT 0,
  current_work_done NUMERIC(15,2) DEFAULT 0,
  cumulative_value NUMERIC(15,2) DEFAULT 0,
  retention_deduction NUMERIC(15,2) DEFAULT 0,
  advance_recovery NUMERIC(15,2) DEFAULT 0,
  other_deductions NUMERIC(15,2) DEFAULT 0,
  net_payable NUMERIC(15,2) DEFAULT 0,
  completion_pct NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  submitted_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, ipc_number)
);

-- IPC line items (per BOQ item)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contract_ipcs_contract_id ON contract_ipcs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_ipcs_project_id ON contract_ipcs(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_ipc_lines_ipc_id ON contract_ipc_lines(ipc_id);

-- Enable RLS (policies added in Phase 7)
ALTER TABLE contract_ipcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_ipc_lines ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies (will be tightened in Phase 7)
CREATE POLICY "Allow all authenticated users to manage IPCs" ON contract_ipcs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to manage IPC lines" ON contract_ipc_lines
  FOR ALL USING (auth.role() = 'authenticated');
