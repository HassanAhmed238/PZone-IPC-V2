-- ============================================================
-- Migration 003: Contract Alarm Rules
-- Configurable alarm/notification triggers per contract
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL CHECK (alarm_type IN (
    'ipc_overdue',
    'milestone_approaching', 
    'expiry_warning',
    'retention_release',
    'defects_liability_end',
    'schedule_delay',
    'custom'
  )),
  trigger_days_before INTEGER DEFAULT 7,
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  notify_roles TEXT[] DEFAULT '{"contract_admin", "project_manager"}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_contract_alarms_contract ON contract_alarms(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_alarms_active ON contract_alarms(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE contract_alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to manage alarms" ON contract_alarms
  FOR ALL USING (auth.role() = 'authenticated');
