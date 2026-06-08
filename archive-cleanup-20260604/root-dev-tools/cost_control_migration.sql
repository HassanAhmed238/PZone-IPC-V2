-- ============================================================
-- P-Zone ERP — Cost Control Engine (M03 + M10) Migration
-- PRD REQ-001 to REQ-034
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. COST CODES MASTER (REQ-001)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- e.g. DC-MT-01
  name_ar TEXT NOT NULL,              -- Arabic name
  name_en TEXT NOT NULL,              -- English name
  category TEXT NOT NULL,             -- 'direct' | 'indirect' | 'markup' | 'warehouse'
  parent_code TEXT,                   -- e.g. DC-MT
  resource_type TEXT,                 -- RC | SUB | EQP | RFT | WOD | SCA | OTH | LB | MT | SC
  is_direct BOOLEAN DEFAULT TRUE,     -- D or I
  accounting_mapping TEXT,            -- Axiom/finance account code
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved','draft','retired')),
  owner_id UUID REFERENCES auth.users(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed P-Zone cost codes from PRD Section 04
INSERT INTO cost_codes (code, name_ar, name_en, category, resource_type, is_direct, sort_order) VALUES
-- Direct Labor
('DC-LB',    'تكلفة مباشرة - عمالة',    'Direct Cost - Labor',          'direct', 'LB', true, 10),
('DC-LB-01', 'عمالة ماهرة',             'Skilled Labor',                 'direct', 'LB', true, 11),
('DC-LB-02', 'عمالة غير ماهرة',        'Unskilled Labor',               'direct', 'LB', true, 12),
('DC-LB-03', 'مشرفون',                 'Supervisors',                   'direct', 'LB', true, 13),
('DC-LB-04', 'عمالة مقاول',            'Subcon Labor',                  'direct', 'LB', true, 14),
-- Direct Materials
('DC-MT',    'تكلفة مباشرة - مواد',     'Direct Cost - Materials',       'direct', 'MT', true, 20),
('DC-MT-01', 'مواد أساسية',            'Main Materials',                 'direct', 'RC', true, 21),
('DC-MT-02', 'مواد تشطيب',             'Finishing Materials',            'direct', 'MT', true, 22),
('DC-MT-03', 'مواد كيميائية',          'Chemical Materials',             'direct', 'MT', true, 23),
('DC-MT-04', 'مواد كهربائية',          'Electrical Materials',           'direct', 'MT', true, 24),
('DC-MT-05', 'مواد ميكانيكا',          'Mechanical Materials',           'direct', 'MT', true, 25),
('DC-MT-06', 'حديد تسليح',             'Reinforcement Steel',            'direct', 'RFT', true, 26),
('DC-MT-07', 'خشب وسقالات',            'Wood & Scaffolding',             'direct', 'WOD', true, 27),
-- Direct Equipment
('DC-EQ',    'تكلفة مباشرة - معدات',   'Direct Cost - Equipment',       'direct', 'EQP', true, 30),
('DC-EQ-01', 'معدات مملوكة',           'Owned Equipment',                'direct', 'EQP', true, 31),
('DC-EQ-02', 'معدات مستأجرة',         'Rented Equipment',               'direct', 'EQP', true, 32),
('DC-EQ-03', 'إيجار داخلي',           'Internal Rent',                  'direct', 'EQP', true, 33),
('DC-EQ-04', 'صيانة طارئة',           'Emergency Maintenance',          'direct', 'EQP', true, 34),
-- Direct Subcontractors
('DC-SC',    'تكلفة مباشرة - مقاول باطن','Direct Cost - Subcontractors','direct', 'SUB', true, 40),
('DC-SC-01', 'أعمال مدنية',           'Civil Works',                    'direct', 'SUB', true, 41),
('DC-SC-02', 'أعمال ميكانيكا',        'Mechanical Works',               'direct', 'SUB', true, 42),
('DC-SC-03', 'أعمال كهرباء',          'Electrical Works',               'direct', 'SUB', true, 43),
('DC-SC-04', 'أعمال تشطيبات',         'Finishing Works',                'direct', 'SUB', true, 44),
('DC-SC-05', 'أعمال تخصصية',          'Specialist Works',               'direct', 'SUB', true, 45),
-- Indirect Operations
('IC-OP',    'غير مباشر - تشغيل',     'Indirect - Operations',          'indirect', NULL, false, 50),
('IC-OP-01', 'رواتب إداريين',         'Admin Salaries',                 'indirect', NULL, false, 51),
('IC-OP-02', 'تعبئة وحركة',           'Mobilization',                   'indirect', NULL, false, 52),
('IC-OP-03', 'معدات عامة',            'General Equipment',              'indirect', 'EQP', false, 53),
('IC-OP-04', 'مصاريف مكتب',          'Office Expenses',                'indirect', NULL, false, 54),
('IC-OP-05', 'استشارات',              'Consultancy',                    'indirect', NULL, false, 55),
-- Indirect Financial
('IC-FL',    'غير مباشر - مالي',      'Indirect - Financial & Legal',   'indirect', NULL, false, 60),
('IC-FL-01', 'تأمينات',               'Insurance',                      'indirect', NULL, false, 61),
('IC-FL-02', 'رسوم وطوابع',           'Fees & Stamps',                  'indirect', NULL, false, 62),
('IC-FL-03', 'ضمانات بنكية',          'Bank Guarantees',                'indirect', NULL, false, 63),
('IC-FL-04', 'فوائد تمويل',           'Finance Interest',               'indirect', NULL, false, 64),
-- Risk Reserve
('IC-RR',    'احتياطي مخاطر',         'Risk Reserve',                   'indirect', NULL, false, 70),
('IC-RR-01', 'طوارئ',                 'Contingency',                    'indirect', NULL, false, 71),
('IC-RR-02', 'احتياطي ضمان',          'Warranty Reserve',               'indirect', NULL, false, 72),
('IC-RR-03', 'احتياطي تصميم',         'Design Reserve',                 'indirect', NULL, false, 73),
-- Markup
('MK-GP',   'هامش ربح',              'Markup & Gross Profit',           'markup', NULL, false, 80),
('MK-GP-01','مصاريف عامة مركز',      'HO G&A',                         'markup', NULL, false, 81),
('MK-GP-02','فوائد تمويل',           'Fund Interest',                   'markup', NULL, false, 82),
('MK-GP-03','صافي ربح',              'Net Profit',                      'markup', NULL, false, 83),
('MK-GP-04','ضرائب',                 'Taxes',                           'markup', NULL, false, 84),
-- Warehouses
('WH-CAI',  'مستودع القاهرة',        'Cairo Warehouse',                 'warehouse', NULL, false, 90),
('WH-SOK',  'مستودع السخنة',         'Sokhna Warehouse',                'warehouse', NULL, false, 91),
('WH-HRG',  'مستودع الغردقة',        'Hurghada Warehouse',              'warehouse', NULL, false, 92),
('WH-NCS',  'مستودع الساحل',         'North Coast Warehouse',           'warehouse', NULL, false, 93),
('WH-NAC',  'مستودع العاصمة',        'New Admin Capital Warehouse',     'warehouse', NULL, false, 94)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. DIRECT DETAIL REGISTER (REQ-026 — per BOQ item EVM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_detail_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  period_id UUID,                       -- links to cost_report_periods
  boq_item_id UUID,                     -- links to budget_lines if exists
  cost_code TEXT REFERENCES cost_codes(code),
  main_area TEXT,                       -- e.g. Division
  sub_area TEXT,                        -- e.g. Section
  item_description TEXT NOT NULL,
  unit TEXT DEFAULT 'LS',
  -- Budget & Contract
  budget_qty NUMERIC DEFAULT 0,
  budget_rate NUMERIC DEFAULT 0,        -- Budget Rate
  budget_amount NUMERIC GENERATED ALWAYS AS (budget_qty * budget_rate) STORED,
  contract_qty NUMERIC DEFAULT 0,
  contract_rate NUMERIC DEFAULT 0,      -- Contract Rate
  contract_amount NUMERIC GENERATED ALWAYS AS (contract_qty * contract_rate) STORED,
  -- Progress from site
  qs_final_qty NUMERIC DEFAULT 0,       -- QS certified quantity
  work_performed_qty NUMERIC DEFAULT 0, -- Actual quantity done
  overall_pct NUMERIC DEFAULT 0,        -- Completion %
  -- EVM Metrics (calculated)
  bac NUMERIC DEFAULT 0,                -- Budget at Completion
  ev NUMERIC DEFAULT 0,                 -- Earned Value = BAC × %
  ac NUMERIC DEFAULT 0,                 -- Actual Cost (from actual_cost_ledger)
  etc NUMERIC DEFAULT 0,                -- Estimate to Complete
  eac NUMERIC DEFAULT 0,                -- EAC = AC + ETC
  vac NUMERIC DEFAULT 0,                -- VAC = BAC - EAC
  cv NUMERIC DEFAULT 0,                 -- CV = EV - AC
  cpi NUMERIC DEFAULT 1,               -- CPI = EV / AC
  status TEXT DEFAULT 'active' CHECK (status IN ('active','closed','on_hold')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. COST REPORT PERIODS — Period Lock (REQ-033)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_report_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_label TEXT GENERATED ALWAYS AS (
    period_year::TEXT || '-' || LPAD(period_month::TEXT, 2, '0')
  ) STORED,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','locked','reopened')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  reopen_reason TEXT,
  total_actual_cost NUMERIC DEFAULT 0,
  total_ev NUMERIC DEFAULT 0,
  total_bac NUMERIC DEFAULT 0,
  cpi_snapshot NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, period_year, period_month)
);

-- ─────────────────────────────────────────────────────────────
-- 4. ACTUAL COST LEDGER (REQ-028 — by period/code/source)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actual_cost_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  period_id UUID REFERENCES cost_report_periods(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  cost_code TEXT REFERENCES cost_codes(code),
  is_direct BOOLEAN DEFAULT TRUE,       -- D or I
  source TEXT NOT NULL CHECK (source IN (
    'invoice','grn','material_issue','subcon_ipc','asset_depreciation',
    'payroll','manual_adjustment','equipment_usage'
  )),
  source_doc_id TEXT,                   -- reference to source document id
  source_doc_ref TEXT,                  -- human-readable ref e.g. INV-2026-001
  item_description TEXT,
  unit TEXT DEFAULT 'LS',
  currency TEXT DEFAULT 'EGP',
  qty NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (qty * unit_price) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 5. WORK PACKAGE FORECASTS (REQ-029 — resource-level ETC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_package_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  direct_detail_id UUID REFERENCES direct_detail_register(id),
  period_id UUID REFERENCES cost_report_periods(id),
  resource_code TEXT NOT NULL CHECK (resource_code IN (
    'RC','SUB-1','SUB-2','EQP','RFT','WOD','SCA','OTH'
  )),
  resource_description TEXT,
  actual_cost NUMERIC DEFAULT 0,
  work_performed_qty NUMERIC DEFAULT 0,
  actual_rate NUMERIC DEFAULT 0,
  qs_qty NUMERIC DEFAULT 0,
  forecast_unit_rate NUMERIC DEFAULT 0,
  etc NUMERIC GENERATED ALWAYS AS (
    GREATEST(qs_qty - work_performed_qty, 0) * forecast_unit_rate
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. BVR REQUESTS — Budget Variance Requests (REQ-010)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bvr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bvr_number TEXT UNIQUE,               -- auto-generated: BVR-2026-001
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  cost_code TEXT REFERENCES cost_codes(code),
  boq_item_description TEXT,
  original_budget NUMERIC DEFAULT 0,
  requested_amount NUMERIC DEFAULT 0,   -- additional budget requested
  revised_budget NUMERIC DEFAULT 0,     -- original + requested
  variance_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN original_budget > 0 
      THEN (requested_amount / original_budget * 100) 
      ELSE 0 
    END
  ) STORED,
  reason TEXT NOT NULL,
  justification TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','cc_reviewed','commercial_approved','ceo_approved','rejected'
  )),
  -- Approval chain
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  cc_reviewed_by UUID REFERENCES auth.users(id),
  cc_reviewed_at TIMESTAMPTZ,
  cc_notes TEXT,
  commercial_approved_by UUID REFERENCES auth.users(id),
  commercial_approved_at TIMESTAMPTZ,
  commercial_notes TEXT,
  ceo_approved_by UUID REFERENCES auth.users(id),
  ceo_approved_at TIMESTAMPTZ,
  ceo_notes TEXT,
  rejection_reason TEXT,
  requires_ceo_approval BOOLEAN DEFAULT FALSE,  -- true if > threshold
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate BVR number
CREATE OR REPLACE FUNCTION set_bvr_number()
RETURNS TRIGGER AS $$
DECLARE
  seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(bvr_number, '-', 3) AS INT)
  ), 0) + 1
  INTO seq
  FROM bvr_requests
  WHERE bvr_number LIKE 'BVR-' || EXTRACT(YEAR FROM now()) || '-%';
  
  NEW.bvr_number := 'BVR-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bvr_number
  BEFORE INSERT ON bvr_requests
  FOR EACH ROW WHEN (NEW.bvr_number IS NULL)
  EXECUTE FUNCTION set_bvr_number();

-- ─────────────────────────────────────────────────────────────
-- 7. MATERIAL WASTE TRACKING (REQ-030)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_waste_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  period_id UUID REFERENCES cost_report_periods(id),
  material_code TEXT,
  material_description TEXT NOT NULL,
  unit TEXT DEFAULT 'TON',
  -- Quantities
  received_qty NUMERIC DEFAULT 0,         -- Total received at site
  external_issue_qty NUMERIC DEFAULT 0,   -- Returned / issued out
  storage_balance_qty NUMERIC DEFAULT 0,  -- Remaining in site store
  site_stock_qty NUMERIC DEFAULT 0,       -- Physically measured
  -- Consumption
  actual_consumption_qty NUMERIC DEFAULT 0,   -- Used in work
  engineering_consumption_qty NUMERIC DEFAULT 0, -- What design says
  waste_qty NUMERIC GENERATED ALWAYS AS (
    GREATEST(actual_consumption_qty - engineering_consumption_qty, 0)
  ) STORED,
  -- Percentages
  waste_pct NUMERIC DEFAULT 0,            -- Actual Waste %
  budget_waste_pct NUMERIC DEFAULT 0,     -- Allowed Waste %
  waste_variance_pct NUMERIC GENERATED ALWAYS AS (waste_pct - budget_waste_pct) STORED,
  is_over_budget BOOLEAN DEFAULT FALSE,   -- Alert flag
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 8. INDIRECT DETAIL REGISTER (REQ-027)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indirect_detail_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  period_id UUID REFERENCES cost_report_periods(id),
  cost_code TEXT REFERENCES cost_codes(code),
  description TEXT NOT NULL,
  monthly_budget NUMERIC DEFAULT 0,
  contract_duration_months INT DEFAULT 0,
  elapsed_months INT DEFAULT 0,
  remaining_months INT GENERATED ALWAYS AS (
    GREATEST(contract_duration_months - elapsed_months, 0)
  ) STORED,
  progress_pct NUMERIC DEFAULT 0,
  ev NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  bac NUMERIC GENERATED ALWAYS AS (monthly_budget * contract_duration_months) STORED,
  etc NUMERIC DEFAULT 0,   -- can be overridden with approval
  eac NUMERIC GENERATED ALWAYS AS (actual_cost + etc) STORED,
  etc_override BOOLEAN DEFAULT FALSE,
  etc_override_approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 9. RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_detail_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_package_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bvr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE indirect_detail_register ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "auth_read_cost_codes" ON cost_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_direct_detail" ON direct_detail_register FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_periods" ON cost_report_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_actual_ledger" ON actual_cost_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_wp_forecasts" ON work_package_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bvr" ON bvr_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_waste" ON material_waste_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_indirect" ON indirect_detail_register FOR SELECT TO authenticated USING (true);

-- Allow inserts/updates for authenticated users
CREATE POLICY "auth_write_cost_codes" ON cost_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_write_direct_detail" ON direct_detail_register FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_periods" ON cost_report_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_actual_ledger" ON actual_cost_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_wp_forecasts" ON work_package_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_bvr" ON bvr_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_waste" ON material_waste_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_indirect" ON indirect_detail_register FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 10. INDEXES for performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_direct_detail_project ON direct_detail_register(project_id);
CREATE INDEX IF NOT EXISTS idx_direct_detail_period ON direct_detail_register(period_id);
CREATE INDEX IF NOT EXISTS idx_actual_ledger_project ON actual_cost_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_actual_ledger_period ON actual_cost_ledger(period_id);
CREATE INDEX IF NOT EXISTS idx_actual_ledger_month ON actual_cost_ledger(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_bvr_project ON bvr_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_bvr_status ON bvr_requests(status);
CREATE INDEX IF NOT EXISTS idx_waste_project ON material_waste_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_periods_project ON cost_report_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_indirect_project ON indirect_detail_register(project_id);

-- ─────────────────────────────────────────────────────────────
-- 11. ADD cost_code COLUMN to existing tables if missing
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='actual_costs' AND column_name='cost_code'
  ) THEN
    ALTER TABLE actual_costs ADD COLUMN cost_code TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='actual_costs' AND column_name='period_year'
  ) THEN
    ALTER TABLE actual_costs ADD COLUMN period_year INT;
    ALTER TABLE actual_costs ADD COLUMN period_month INT;
    ALTER TABLE actual_costs ADD COLUMN source_type TEXT DEFAULT 'manual';
  END IF;
END $$;
