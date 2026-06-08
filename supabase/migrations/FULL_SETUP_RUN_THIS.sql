-- ============================================================
-- IPC FULL SETUP: Migration + Sample Data
-- Paste this entire file into Supabase SQL Editor and run
-- ============================================================

-- ─── PART 1: Migration ───────────────────────────────────────

-- 1. Project Master Table
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
  variation_orders  jsonb DEFAULT '[]'::jsonb,
  is_active         boolean DEFAULT true,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS for ipc_projects
ALTER TABLE ipc_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ipc_projects_read" ON ipc_projects;
DROP POLICY IF EXISTS "ipc_projects_write" ON ipc_projects;
CREATE POLICY "ipc_projects_read"  ON ipc_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ipc_projects_write" ON ipc_projects FOR ALL    USING (auth.role() = 'authenticated');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_ipc_projects_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ipc_projects_updated_at ON ipc_projects;
CREATE TRIGGER trg_ipc_projects_updated_at
  BEFORE UPDATE ON ipc_projects
  FOR EACH ROW EXECUTE FUNCTION update_ipc_projects_updated_at();

-- 2. Add new columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tax_type               text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS tax_amount             numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_direction          text DEFAULT 'added',
  ADD COLUMN IF NOT EXISTS approved_tax_type      text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS approved_tax_amount    numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_tax_direction text DEFAULT 'added',
  ADD COLUMN IF NOT EXISTS share_token            text UNIQUE,
  ADD COLUMN IF NOT EXISTS approval_date          date,
  ADD COLUMN IF NOT EXISTS collection_date        date,
  ADD COLUMN IF NOT EXISTS ipc_project_id         uuid REFERENCES ipc_projects(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_share_token   ON invoices(share_token)   WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_project_code  ON invoices(project_code);
CREATE INDEX IF NOT EXISTS idx_invoices_ipc_project   ON invoices(ipc_project_id);

-- ─── PART 2: Sample Projects ─────────────────────────────────

INSERT INTO ipc_projects (project_code, project_name, client, sector, project_manager, contract_value, start_date, end_date, location, description, variation_orders, is_active)
VALUES
('25-01','SOUL West Compound — Infrastructure Phase 1','SODIC','Housing','Eng. Ahmed Hassan',18500000,'2025-01-15','2026-06-30','Sheikh Zayed, Giza','Infrastructure works including roads, utilities, and drainage for Phase 1',
 '[{"vo_number":"VO-001","description":"Additional road works - Area C","amount":1200000,"status":"approved"},{"vo_number":"VO-002","description":"Drainage system extension","amount":850000,"status":"pending"}]'::jsonb, true),

('25-02','AAIB HQ Renovation — MEP Works','Arab African International Bank','Commercial','Eng. Sara Mostafa',7200000,'2025-03-01','2025-12-31','Garden City, Cairo','Complete MEP renovation of headquarters building',
 '[{"vo_number":"VO-001","description":"Smart building automation system","amount":600000,"status":"approved"}]'::jsonb, true),

('25-03','Palm Hills October — Finishing Package B','Palm Hills Developments','Housing','Eng. Mohamed Kamel',24000000,'2025-02-01','2026-08-31','6th of October City','Internal finishing works for residential units B1–B6',
 '[{"vo_number":"VO-001","description":"Upgraded flooring specifications","amount":1800000,"status":"approved"},{"vo_number":"VO-002","description":"Additional units B7-B8","amount":3200000,"status":"approved"},{"vo_number":"VO-003","description":"Landscaping scope addition","amount":950000,"status":"pending"}]'::jsonb, true),

('24-08','Heliopolis Hospital Expansion — Civil Works','Cairo Medical Group','Healthcare','Eng. Khaled Ibrahim',31000000,'2024-08-01','2026-03-31','Heliopolis, Cairo','New 4-floor expansion wing with basement parking',
 '[{"vo_number":"VO-001","description":"Structural reinforcement - zone 3","amount":2100000,"status":"approved"}]'::jsonb, true),

('25-05','New Admin Capital — Roads Package 7','Administrative Capital for Urban Development','Infrastructure','Eng. Tarek Nabil',55000000,'2025-05-01','2027-04-30','New Administrative Capital','Road network and utility corridors for government district sector 7',
 '[{"vo_number":"VO-001","description":"Pedestrian bridges x3","amount":4200000,"status":"approved"},{"vo_number":"VO-002","description":"Lighting upgrade to LED","amount":1100000,"status":"approved"}]'::jsonb, true)

ON CONFLICT (project_code) DO NOTHING;

-- ─── PART 3: Sample IPC Records ──────────────────────────────

DO $$
DECLARE p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
BEGIN
  SELECT id INTO p1 FROM ipc_projects WHERE project_code = '25-01';
  SELECT id INTO p2 FROM ipc_projects WHERE project_code = '25-02';
  SELECT id INTO p3 FROM ipc_projects WHERE project_code = '25-03';
  SELECT id INTO p4 FROM ipc_projects WHERE project_code = '24-08';
  SELECT id INTO p5 FROM ipc_projects WHERE project_code = '25-05';

  -- 25-01 IPC #1
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('25-01','SOUL West Compound — Infrastructure Phase 1','SODIC','Housing',18500000,p1,'1','submitted','2025-03-15','معتمد',0,3200000,4400000,0,'[{"vo_number":"VO-001","description":"Additional road works","amount":1200000}]','[{"name":"Retention 10%","amount":440000},{"name":"Performance Bond 5%","amount":220000}]','5%','added',220000,660000,0,3300000,3300000,0,2900000,4100000,'[{"vo_number":"VO-001","description":"Additional road works","amount":1200000}]','[{"name":"Retention 10%","amount":410000},{"name":"Performance Bond 5%","amount":205000}]','5%','added',205000,615000,0,3075000,3075000,2500000,1200000,3075000,0.2378,'2025-04-10','Approved with minor deduction adjustment per site engineer report');

  -- 25-01 IPC #2
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_notes)
  VALUES ('25-01','SOUL West Compound — Infrastructure Phase 1','SODIC','Housing',18500000,p1,'2','submitted','2025-06-01','تحت الاعتماد',3200000,2800000,7200000,0,'[{"vo_number":"VO-001","description":"Additional road works","amount":1200000}]','[{"name":"Retention 10%","amount":720000},{"name":"Performance Bond 5%","amount":360000}]','5%','added',360000,1080000,3200000,3080000,6120000,2900000,2500000,6600000,'[{"vo_number":"VO-001","description":"Additional road works","amount":1200000}]','[{"name":"Retention 10%","amount":660000},{"name":"Performance Bond 5%","amount":330000}]','5%','added',330000,990000,2900000,2640000,5610000,0,2400000,5610000,0.3892,'Pending client review');

  -- 25-02 IPC #1
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('25-02','AAIB HQ Renovation — MEP Works','Arab African International Bank','Commercial',7200000,p2,'1','submitted','2025-05-10','معتمد',0,1800000,2400000,0,'[{"vo_number":"VO-001","description":"Smart building automation","amount":600000}]','[{"name":"Retention 5%","amount":120000},{"name":"Tax Withholding 3%","amount":72000}]','14%','added',336000,192000,0,2136000,2136000,0,1700000,2300000,'[{"vo_number":"VO-001","description":"Smart building automation","amount":600000}]','[{"name":"Retention 5%","amount":115000},{"name":"Tax Withholding 3%","amount":69000}]','14%','added',322000,184000,0,2116000,2116000,2116000,0,2116000,0.3333,'2025-06-01','Fully approved and collected');

  -- 25-02 IPC #2
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_notes)
  VALUES ('25-02','AAIB HQ Renovation — MEP Works','Arab African International Bank','Commercial',7200000,p2,'2','submitted','2025-08-20','جارى المراجعه للتقديم',1800000,2100000,4500000,0,'[{"vo_number":"VO-001","description":"Smart building automation","amount":600000}]','[{"name":"Retention 5%","amount":225000},{"name":"Tax Withholding 3%","amount":135000}]','14%','added',630000,360000,1800000,2100000,3900000,0,0,0,'[]','[]','none','added',0,0,0,0,0,0,2700000,3900000,0.625,'Under review by client technical team');

  -- 25-03 IPC #1
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('25-03','Palm Hills October — Finishing Package B','Palm Hills Developments','Housing',24000000,p3,'1','submitted','2025-04-01','معتمد',0,4200000,10200000,0,'[{"vo_number":"VO-001","description":"Upgraded flooring","amount":1800000},{"vo_number":"VO-002","description":"Additional units B7-B8","amount":4200000}]','[{"name":"Retention 10%","amount":1020000},{"name":"Advance Recovery 15%","amount":1530000}]','5.04%','added',514080,2550000,0,7650000,7650000,0,3800000,9800000,'[{"vo_number":"VO-001","description":"Upgraded flooring","amount":1800000},{"vo_number":"VO-002","description":"Additional units B7-B8","amount":4200000}]','[{"name":"Retention 10%","amount":980000},{"name":"Advance Recovery 15%","amount":1470000}]','5.04%','added',494192,2450000,0,7350000,7350000,7350000,3000000,7350000,0.425,'2025-05-15','Approved. Advance recovery applied as per contract clause 18.');

  -- 25-03 IPC #2
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_notes)
  VALUES ('25-03','Palm Hills October — Finishing Package B','Palm Hills Developments','Housing',24000000,p3,'2','submitted','2025-07-15','تحت الاعتماد',4200000,3600000,13800000,0,'[{"vo_number":"VO-001","description":"Upgraded flooring","amount":1800000},{"vo_number":"VO-002","description":"Additional units B7-B8","amount":4200000}]','[{"name":"Retention 10%","amount":1380000},{"name":"Advance Recovery 15%","amount":2070000}]','5.04%','added',695520,3450000,4200000,3400000,10350000,3800000,3400000,13200000,'[{"vo_number":"VO-001","description":"Upgraded flooring","amount":1800000},{"vo_number":"VO-002","description":"Additional units B7-B8","amount":4200000}]','[{"name":"Retention 10%","amount":1320000},{"name":"Advance Recovery 15%","amount":1980000}]','5.04%','added',665280,3300000,3800000,3200000,9900000,5000000,5000000,9900000,0.575,'Submitted pending client approval');

  -- 24-08 IPC #1
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('24-08','Heliopolis Hospital Expansion — Civil Works','Cairo Medical Group','Healthcare',31000000,p4,'1','submitted','2025-01-10','معتمد',0,5500000,7600000,0,'[{"vo_number":"VO-001","description":"Structural reinforcement","amount":2100000}]','[{"name":"Retention 5%","amount":380000},{"name":"Insurance 2%","amount":152000},{"name":"Advance Recovery 20%","amount":1520000}]','none','added',0,2052000,0,5548000,5548000,0,5200000,7300000,'[{"vo_number":"VO-001","description":"Structural reinforcement","amount":2100000}]','[{"name":"Retention 5%","amount":365000},{"name":"Insurance 2%","amount":146000},{"name":"Advance Recovery 20%","amount":1460000}]','none','added',0,1971000,0,5329000,5329000,5329000,2400000,5329000,0.2452,'2025-02-15','Approved. All inspections passed.');

  -- 24-08 IPC #2
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('24-08','Heliopolis Hospital Expansion — Civil Works','Cairo Medical Group','Healthcare',31000000,p4,'2','submitted','2025-05-20','معتمد',5500000,6200000,13800000,0,'[{"vo_number":"VO-001","description":"Structural reinforcement","amount":2100000}]','[{"name":"Retention 5%","amount":690000},{"name":"Insurance 2%","amount":276000},{"name":"Advance Recovery 20%","amount":2760000}]','none','added',0,3726000,5500000,4574000,10074000,5200000,5800000,13100000,'[{"vo_number":"VO-001","description":"Structural reinforcement","amount":2100000}]','[{"name":"Retention 5%","amount":655000},{"name":"Insurance 2%","amount":262000},{"name":"Advance Recovery 20%","amount":2620000}]','none','added',0,3537000,5200000,4363000,9563000,8000000,4200000,9563000,0.4452,'2025-06-30','Approved with deduction reconciliation.');

  -- 25-05 IPC #1
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_date,approval_notes)
  VALUES ('25-05','New Admin Capital — Roads Package 7','Administrative Capital for Urban Development','Infrastructure',55000000,p5,'1','submitted','2025-06-01','معتمد',0,8500000,13800000,0,'[{"vo_number":"VO-001","description":"Pedestrian bridges x3","amount":4200000},{"vo_number":"VO-002","description":"LED lighting","amount":1100000}]','[{"name":"Retention 10%","amount":1380000},{"name":"Performance Bond 5%","amount":690000},{"name":"Advance Recovery 15%","amount":2070000}]','5%','added',690000,4140000,0,9660000,9660000,0,7800000,13100000,'[{"vo_number":"VO-001","description":"Pedestrian bridges x3","amount":4200000},{"vo_number":"VO-002","description":"LED lighting","amount":1100000}]','[{"name":"Retention 10%","amount":1310000},{"name":"Performance Bond 5%","amount":655000},{"name":"Advance Recovery 15%","amount":1965000}]','5%','added',655000,3930000,0,9170000,9170000,9170000,5000000,9170000,0.2509,'2025-07-15','Approved. Full payment received.');

  -- 25-05 IPC #2
  INSERT INTO invoices (project_code,project_name,client,sector,contract_value,ipc_project_id,invoice_number,invoice_type,submitted_date,status,work_previous,work_current,work_total,fluctuation_amount,variations,deductions_breakdown,tax_type,tax_direction,tax_amount,total_deductions,net_previous,net_current,net_total,approved_previous,approved_current,approved_total,approved_variations,approved_deductions_breakdown,approved_tax_type,approved_tax_direction,approved_tax_amount,approved_deductions,approved_net_previous,approved_net_current,approved_net_total,total_collections,unbilled,expected_collection,contract_percentage,approval_notes)
  VALUES ('25-05','New Admin Capital — Roads Package 7','Administrative Capital for Urban Development','Infrastructure',55000000,p5,'2','submitted','2025-10-01','تحت الاعتماد',8500000,9200000,23000000,350000,'[{"vo_number":"VO-001","description":"Pedestrian bridges x3","amount":4200000},{"vo_number":"VO-002","description":"LED lighting","amount":1100000}]','[{"name":"Retention 10%","amount":2300000},{"name":"Performance Bond 5%","amount":1150000},{"name":"Advance Recovery 15%","amount":3450000}]','5%','added',1150000,6900000,8500000,6100000,15100000,7800000,8800000,21900000,'[{"vo_number":"VO-001","description":"Pedestrian bridges x3","amount":4200000},{"vo_number":"VO-002","description":"LED lighting","amount":1100000}]','[{"name":"Retention 10%","amount":2190000},{"name":"Performance Bond 5%","amount":1095000},{"name":"Advance Recovery 15%","amount":3285000}]','5%','added',1095000,6570000,7800000,6630000,14430000,5000000,10000000,14430000,0.4182,'Pending approval — submitted for Q4 cycle');

END $$;

-- ─── Verify ──────────────────────────────────────────────────
SELECT 'ipc_projects' as tbl, count(*) as rows FROM ipc_projects
UNION ALL
SELECT 'invoices (IPC)', count(*) FROM invoices
  WHERE project_code IN ('25-01','25-02','25-03','24-08','25-05');
