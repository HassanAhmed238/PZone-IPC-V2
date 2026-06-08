-- ============================================================
-- Migration 004: Project-Notebook Mapping
-- Maps NotebookLM notebooks to projects and contracts
-- ============================================================

CREATE TABLE IF NOT EXISTS project_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  notebook_id TEXT NOT NULL,  -- NotebookLM UUID
  notebook_title TEXT,
  source_type TEXT DEFAULT 'contract' CHECK (source_type IN (
    'contract', 'correspondence', 'drawings', 'specifications', 'rfi', 'submittal', 'other'
  )),
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notebook_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_notebooks_project ON project_notebooks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notebooks_contract ON project_notebooks(contract_id);

-- Enable RLS
ALTER TABLE project_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to manage notebooks" ON project_notebooks
  FOR ALL USING (auth.role() = 'authenticated');
