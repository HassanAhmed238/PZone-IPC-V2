-- ============================================================
-- AXIOM INTEGRATION TABLES
-- Bridges P-Zone ERP ↔ Axiom ERP (axiomsys.net)
-- ============================================================

-- 1. Axiom Item Master (synced from Axiom warehouse reports)
CREATE TABLE IF NOT EXISTS axiom_item_master (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code       text NOT NULL UNIQUE,           -- كود الصنف  e.g. 1034900001
  item_group      text,                            -- مجموعة الاصناف
  item_name_ar    text NOT NULL,                   -- الصنف (Arabic)
  item_name_en    text,
  unit            text DEFAULT 'عدد',              -- الوحدة
  last_unit_cost  numeric(14,4) DEFAULT 0,         -- last seen التكلفة
  avg_unit_cost   numeric(14,4) DEFAULT 0,
  total_qty_in    numeric(14,3) DEFAULT 0,         -- cumulative from all imports
  last_synced_at  timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. Axiom Import Sessions (each time user uploads an Axiom report)
CREATE TABLE IF NOT EXISTS axiom_import_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       text NOT NULL,
  file_type       text DEFAULT 'warehouse_report',   -- warehouse_report | po_report | invoice_report
  imported_by     uuid REFERENCES auth.users(id),
  row_count       int DEFAULT 0,
  success_count   int DEFAULT 0,
  error_count     int DEFAULT 0,
  total_value     numeric(16,2) DEFAULT 0,
  date_from       date,
  date_to         date,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_log       jsonb DEFAULT '[]',
  created_at      timestamptz DEFAULT now()
);

-- 3. Axiom Import Lines (individual rows from imported Axiom reports)
CREATE TABLE IF NOT EXISTS axiom_import_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES axiom_import_sessions(id) ON DELETE CASCADE,
  project_dim     text,                    -- البعد الرابع
  txn_date        date,                    -- تاريخ الحركة
  item_code       text,                    -- كود الصنف
  item_group      text,                    -- مجموعة الاصناف
  supplier_name   text,                    -- المورد
  item_name       text,                    -- الصنف
  unit            text,                    -- الوحدة
  qty             numeric(14,3),           -- الكمية
  unit_cost       numeric(14,4),           -- التكلفة
  total_value     numeric(16,2),           -- الإجمالي
  -- Mapping to P-Zone
  mapped_project_id  uuid REFERENCES ongoing_projects(id),
  mapped_cost_code   text,
  is_posted          boolean DEFAULT false,
  posted_at          timestamptz,
  created_at         timestamptz DEFAULT now()
);

-- 4. Axiom Export Log (POs exported from P-Zone → Axiom format)
CREATE TABLE IF NOT EXISTS axiom_export_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type     text NOT NULL CHECK (export_type IN ('purchase_order','grn','invoice')),
  source_id       uuid,                    -- PO / GRN / Invoice ID
  source_number   text,                    -- PO-PZN-0053 etc
  exported_by     uuid REFERENCES auth.users(id),
  file_name       text,
  row_count       int DEFAULT 0,
  total_value     numeric(16,2) DEFAULT 0,
  exported_at     timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_axiom_lines_session ON axiom_import_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_axiom_lines_item ON axiom_import_lines(item_code);
CREATE INDEX IF NOT EXISTS idx_axiom_lines_project ON axiom_import_lines(mapped_project_id);
CREATE INDEX IF NOT EXISTS idx_axiom_item_code ON axiom_item_master(item_code);

-- RLS
ALTER TABLE axiom_item_master       ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiom_import_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiom_import_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiom_export_log        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "axiom_authenticated" ON axiom_item_master       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "axiom_authenticated" ON axiom_import_sessions   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "axiom_authenticated" ON axiom_import_lines      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "axiom_authenticated" ON axiom_export_log        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function: upsert item master on import
CREATE OR REPLACE FUNCTION upsert_axiom_item(
  p_code text, p_group text, p_name text, p_unit text,
  p_unit_cost numeric, p_qty numeric
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO axiom_item_master (item_code, item_group, item_name_ar, unit, last_unit_cost, avg_unit_cost, total_qty_in, last_synced_at)
  VALUES (p_code, p_group, p_name, p_unit, p_unit_cost, p_unit_cost, p_qty, now())
  ON CONFLICT (item_code) DO UPDATE SET
    item_group     = EXCLUDED.item_group,
    item_name_ar   = EXCLUDED.item_name_ar,
    unit           = EXCLUDED.unit,
    last_unit_cost = EXCLUDED.last_unit_cost,
    avg_unit_cost  = (axiom_item_master.avg_unit_cost + EXCLUDED.last_unit_cost) / 2,
    total_qty_in   = axiom_item_master.total_qty_in + EXCLUDED.total_qty_in,
    last_synced_at = now(),
    updated_at     = now();
END;
$$;
