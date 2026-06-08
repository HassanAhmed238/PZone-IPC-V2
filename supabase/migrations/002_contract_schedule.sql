-- ============================================================
-- Migration 002: Contract Schedule — Baselines & Activities
-- Supports Primavera-style baseline tracking with progress
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  title TEXT NOT NULL,  -- e.g., "Approved Baseline Rev 0"
  approved_date DATE,
  approved_by UUID,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES schedule_baselines(id) ON DELETE CASCADE,
  activity_id TEXT,       -- WBS/Activity ID from P6
  activity_name TEXT NOT NULL,
  parent_id UUID REFERENCES schedule_activities(id),
  planned_start DATE,
  planned_finish DATE,
  actual_start DATE,
  actual_finish DATE,
  planned_duration INTEGER,  -- days
  actual_duration INTEGER,
  weight_pct NUMERIC(5,2) DEFAULT 0,
  planned_pct NUMERIC(5,2) DEFAULT 0,
  actual_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'delayed', 'critical')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_contract ON schedule_baselines(contract_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_baseline ON schedule_activities(baseline_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_parent ON schedule_activities(parent_id);

-- Enable RLS
ALTER TABLE schedule_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_activities ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies
CREATE POLICY "Allow all authenticated users to manage baselines" ON schedule_baselines
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to manage activities" ON schedule_activities
  FOR ALL USING (auth.role() = 'authenticated');
