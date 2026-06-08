-- ============================================================
-- P-Zone ERP — Procurement Module (M04) Migration
-- PRD: PO Control, 3-Way Match, Committed Costs feed
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SUPPLIERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,                         -- SUP-001
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT DEFAULT 'material' CHECK (category IN (
    'material','equipment','subcontractor','service','consultant'
  )),
  tax_number TEXT,
  commercial_reg TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Egypt',
  payment_terms_days INT DEFAULT 30,
  credit_limit NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  bank_name TEXT,
  bank_account TEXT,
  bank_iban TEXT,
  rating INT DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate supplier code
CREATE OR REPLACE FUNCTION set_supplier_code()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(code,'-',2) AS INT)),0)+1
  INTO seq FROM suppliers WHERE code LIKE 'SUP-%';
  NEW.code := 'SUP-' || LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION set_supplier_code();

-- ─────────────────────────────────────────────────────────────
-- 2. PURCHASE REQUESTS (PR)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number TEXT UNIQUE,                    -- PR-2026-001
  project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  cost_code TEXT REFERENCES cost_codes(code),
  requested_by UUID REFERENCES auth.users(id),
  requested_date DATE DEFAULT CURRENT_DATE,
  required_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'material' CHECK (category IN (
    'material','equipment','service','subcontract','other'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','pm_approved','procurement_review','po_issued','cancelled'
  )),
  total_estimated NUMERIC DEFAULT 0,
  -- Approval
  submitted_at TIMESTAMPTZ,
  pm_approved_by UUID REFERENCES auth.users(id),
  pm_approved_at TIMESTAMPTZ,
  pm_notes TEXT,
  procurement_reviewed_by UUID REFERENCES auth.users(id),
  procurement_reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  linked_po_id UUID,                        -- filled when PO is issued
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PR lines
CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  line_no INT DEFAULT 1,
  item_description TEXT NOT NULL,
  unit TEXT DEFAULT 'EA',
  qty NUMERIC DEFAULT 1,
  unit_price_estimate NUMERIC DEFAULT 0,
  total_estimate NUMERIC GENERATED ALWAYS AS (qty * unit_price_estimate) STORED,
  cost_code TEXT REFERENCES cost_codes(code),
  specs TEXT,
  brand_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto PR number
CREATE OR REPLACE FUNCTION set_pr_number()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(pr_number,'-',3) AS INT)),0)+1
  INTO seq FROM purchase_requests
  WHERE pr_number LIKE 'PR-'||EXTRACT(YEAR FROM now())||'-%';
  NEW.pr_number := 'PR-'||EXTRACT(YEAR FROM now())||'-'||LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_number
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW WHEN (NEW.pr_number IS NULL)
  EXECUTE FUNCTION set_pr_number();

-- ─────────────────────────────────────────────────────────────
-- 3. PURCHASE ORDERS (PO) — PO Control (PRD Critical)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,                    -- PO-2026-001
  pr_id UUID REFERENCES purchase_requests(id),
  project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  cost_code TEXT REFERENCES cost_codes(code),
  -- Dates
  po_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_location TEXT,
  -- Financials
  currency TEXT DEFAULT 'EGP',
  subtotal NUMERIC DEFAULT 0,
  vat_pct NUMERIC DEFAULT 14,
  vat_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  -- Status: HARD RULE — GRN blocked until status = 'approved'
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','approved','partially_received','fully_received',
    'invoiced','paid','cancelled','closed'
  )),
  -- Payment terms
  payment_terms TEXT DEFAULT 'net_30',
  payment_terms_days INT DEFAULT 30,
  -- Approval chain
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  rejection_reason TEXT,
  -- Content
  terms_conditions TEXT,
  notes TEXT,
  -- 3-Way Match flags
  grn_count INT DEFAULT 0,               -- how many GRNs received
  invoice_count INT DEFAULT 0,           -- how many invoices matched
  three_way_match_status TEXT DEFAULT 'pending' CHECK (three_way_match_status IN (
    'pending','partial','matched','discrepancy'
  )),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PO lines
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  pr_line_id UUID REFERENCES purchase_request_lines(id),
  line_no INT DEFAULT 1,
  item_code TEXT,
  item_description TEXT NOT NULL,
  unit TEXT DEFAULT 'EA',
  qty_ordered NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (qty_ordered * unit_price) STORED,
  qty_received NUMERIC DEFAULT 0,         -- updated by GRN
  qty_invoiced NUMERIC DEFAULT 0,         -- updated by supplier invoice
  qty_remaining NUMERIC GENERATED ALWAYS AS (qty_ordered - qty_received) STORED,
  cost_code TEXT REFERENCES cost_codes(code),
  specs TEXT,
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto PO number
CREATE OR REPLACE FUNCTION set_po_number()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(po_number,'-',3) AS INT)),0)+1
  INTO seq FROM purchase_orders
  WHERE po_number LIKE 'PO-'||EXTRACT(YEAR FROM now())||'-%';
  NEW.po_number := 'PO-'||EXTRACT(YEAR FROM now())||'-'||LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW WHEN (NEW.po_number IS NULL)
  EXECUTE FUNCTION set_po_number();

-- ─────────────────────────────────────────────────────────────
-- 4. GRN — Goods Receipt Note (BLOCKED without approved PO)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE,                  -- GRN-2026-001
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  -- HARD RULE: can only create if po.status IN ('approved','partially_received')
  received_date DATE DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES auth.users(id),
  delivery_note_ref TEXT,                  -- supplier's delivery note number
  vehicle_plate TEXT,
  driver_name TEXT,
  warehouse_location TEXT DEFAULT 'site',
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','confirmed','posted','discrepancy_reported'
  )),
  notes TEXT,
  total_received_value NUMERIC DEFAULT 0,
  discrepancy_notes TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GRN lines
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES purchase_order_lines(id),
  line_no INT DEFAULT 1,
  item_description TEXT NOT NULL,
  unit TEXT DEFAULT 'EA',
  qty_ordered NUMERIC DEFAULT 0,
  qty_received NUMERIC DEFAULT 0,
  qty_rejected NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (qty_received * unit_price) STORED,
  rejection_reason TEXT,
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto GRN number
CREATE OR REPLACE FUNCTION set_grn_number()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(grn_number,'-',3) AS INT)),0)+1
  INTO seq FROM goods_receipts
  WHERE grn_number LIKE 'GRN-'||EXTRACT(YEAR FROM now())||'-%';
  NEW.grn_number := 'GRN-'||EXTRACT(YEAR FROM now())||'-'||LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grn_number
  BEFORE INSERT ON goods_receipts
  FOR EACH ROW WHEN (NEW.grn_number IS NULL)
  EXECUTE FUNCTION set_grn_number();

-- HARD RULE: Enforce PO must be approved before GRN
CREATE OR REPLACE FUNCTION enforce_po_approval_for_grn()
RETURNS TRIGGER AS $$
DECLARE po_status TEXT;
BEGIN
  SELECT status INTO po_status FROM purchase_orders WHERE id = NEW.po_id;
  IF po_status NOT IN ('approved','partially_received') THEN
    RAISE EXCEPTION 'Cannot create GRN: PO % is not approved (status: %)',
      NEW.po_id, po_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_po_for_grn
  BEFORE INSERT ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION enforce_po_approval_for_grn();

-- ─────────────────────────────────────────────────────────────
-- 5. SUPPLIER INVOICES (for 3-Way Match)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,              -- SINV-2026-001
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  po_id UUID REFERENCES purchase_orders(id),
  grn_id UUID REFERENCES goods_receipts(id),
  project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  invoice_ref TEXT NOT NULL,              -- supplier's invoice number
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT DEFAULT 'EGP',
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  outstanding NUMERIC GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  -- 3-Way Match
  three_way_match_status TEXT DEFAULT 'pending' CHECK (three_way_match_status IN (
    'pending','matched','discrepancy','approved_with_variance'
  )),
  match_variance_amount NUMERIC DEFAULT 0,
  match_variance_reason TEXT,
  -- Approval
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','three_way_matched','approved','paid','disputed','cancelled'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  payment_ref TEXT,
  payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto supplier invoice number
CREATE OR REPLACE FUNCTION set_sinv_number()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number,'-',3) AS INT)),0)+1
  INTO seq FROM supplier_invoices
  WHERE invoice_number LIKE 'SINV-'||EXTRACT(YEAR FROM now())||'-%';
  NEW.invoice_number := 'SINV-'||EXTRACT(YEAR FROM now())||'-'||LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sinv_number
  BEFORE INSERT ON supplier_invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION set_sinv_number();

-- ─────────────────────────────────────────────────────────────
-- 6. AUTO-POST TO committed_costs WHEN PO IS APPROVED
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_po_to_committed_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- When PO is approved, upsert into committed_costs
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO committed_costs (
      project_id, reference_type, reference_id,
      supplier_id, description, total_amount, remaining,
      status, committed_date, cost_code
    ) VALUES (
      NEW.project_id, 'purchase_order', NEW.id,
      NEW.supplier_id,
      'PO: ' || NEW.po_number,
      NEW.total_amount, NEW.remaining_amount,
      'active', now(), NEW.cost_code
    )
    ON CONFLICT (reference_id) DO UPDATE SET
      remaining = NEW.remaining_amount,
      status = CASE WHEN NEW.status IN ('paid','closed') THEN 'closed' ELSE 'active' END;
  END IF;
  -- When PO is paid/closed, close committed cost
  IF NEW.status IN ('paid','closed') THEN
    UPDATE committed_costs SET status='closed', remaining=0
    WHERE reference_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if committed_costs has the needed columns first
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='committed_costs' AND column_name='reference_type'
  ) THEN
    ALTER TABLE committed_costs
      ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT 'purchase_order',
      ADD COLUMN IF NOT EXISTS reference_id UUID,
      ADD COLUMN IF NOT EXISTS committed_date TIMESTAMPTZ DEFAULT now(),
      ADD COLUMN IF NOT EXISTS cost_code TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_committed_ref ON committed_costs(reference_id)
      WHERE reference_id IS NOT NULL;
  END IF;
END $$;

CREATE TRIGGER trg_po_to_committed
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION sync_po_to_committed_costs();

-- ─────────────────────────────────────────────────────────────
-- 7. RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_pr" ON purchase_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_pr_lines" ON purchase_request_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_po" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_po_lines" ON purchase_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_grn" ON goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_grn_lines" ON goods_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_sinv" ON supplier_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pr_project ON purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_po_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_project ON goods_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_sinv_po ON supplier_invoices(po_id);
CREATE INDEX IF NOT EXISTS idx_sinv_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sinv_match ON supplier_invoices(three_way_match_status);

-- ─────────────────────────────────────────────────────────────
-- 9. SEED SAMPLE SUPPLIERS
-- ─────────────────────────────────────────────────────────────
INSERT INTO suppliers (name, name_en, category, payment_terms_days, rating, status) VALUES
('شركة الإمداد للمواد', 'Al-Imdad Materials Co.', 'material', 30, 4, 'active'),
('مجموعة المعدات الحديثة', 'Modern Equipment Group', 'equipment', 45, 5, 'active'),
('مقاولات الجودة', 'Quality Contractors', 'subcontractor', 30, 4, 'active'),
('الخدمات الهندسية المتكاملة', 'Integrated Engineering Services', 'service', 30, 3, 'active'),
('مصنع حديد مصر', 'Egypt Steel Factory', 'material', 60, 5, 'active')
ON CONFLICT DO NOTHING;
