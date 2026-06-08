-- ============================================================
-- P-Zone ERP — Inventory Module (M05) Migration
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. MATERIAL CATALOG / INVENTORY ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,                         -- MAT-001
  name TEXT NOT NULL,                       -- Arabic Name
  name_en TEXT,                             -- English Name
  category TEXT DEFAULT 'material' CHECK (category IN (
    'material', 'cement', 'steel', 'sand_gravel', 'finishing', 'electrical', 'piping', 'tools', 'safety', 'other'
  )),
  unit TEXT DEFAULT 'EA' CHECK (unit IN (
    'EA', 'PCS', 'KG', 'TON', 'M2', 'M3', 'BAG', 'LITER', 'ROLL', 'BOX'
  )),
  min_stock_level NUMERIC DEFAULT 0,
  unit_cost_estimate NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate material code
CREATE OR REPLACE FUNCTION set_item_code()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(code,'-',2) AS INT)),0)+1
  INTO seq FROM inventory_items WHERE code LIKE 'MAT-%';
  NEW.code := 'MAT-' || LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_code
  BEFORE INSERT ON inventory_items
  FOR EACH ROW WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION set_item_code();

-- ─────────────────────────────────────────────────────────────
-- 2. STOCK BALANCES PER SITE (PROJECT & LOCATION)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_location TEXT NOT NULL DEFAULT 'site_store',
  qty_on_hand NUMERIC DEFAULT 0 NOT NULL,
  avg_unit_cost NUMERIC DEFAULT 0 NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, item_id, warehouse_location)
);

-- ─────────────────────────────────────────────────────────────
-- 3. STOCK CARD / DETAILED MOVEMENTS LEDGER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ongoing_projects(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer_in', 'transfer_out', 'adjustment')),
  qty NUMERIC NOT NULL CHECK (qty >= 0),
  unit_cost NUMERIC DEFAULT 0,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('grn', 'site_issue', 'transfer', 'adjustment')),
  reference_id UUID,
  warehouse_location TEXT NOT NULL DEFAULT 'site_store',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. WAREHOUSE TRANSFERS (BETWEEN PROJECT SITES)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT UNIQUE,              -- TRX-2026-001
  from_project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  to_project_id UUID NOT NULL REFERENCES ongoing_projects(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  qty NUMERIC NOT NULL CHECK (qty > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'received', 'cancelled')),
  shipped_date DATE,
  received_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto transfer number
CREATE OR REPLACE FUNCTION set_transfer_number()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(transfer_number,'-',3) AS INT)),0)+1
  INTO seq FROM inventory_transfers
  WHERE transfer_number LIKE 'TRX-'||EXTRACT(YEAR FROM now())||'-%';
  NEW.transfer_number := 'TRX-'||EXTRACT(YEAR FROM now())||'-'||LPAD(seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transfer_number
  BEFORE INSERT ON inventory_transfers
  FOR EACH ROW WHEN (NEW.transfer_number IS NULL)
  EXECUTE FUNCTION set_transfer_number();

-- ─────────────────────────────────────────────────────────────
-- 5. MOVING AVERAGE COST (MAC) AUTO-POSTING FROM GRN
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_grn_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
  line RECORD;
  v_item_id UUID;
  v_item_code TEXT;
  seq INT;
BEGIN
  -- We only run when status transitions to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    FOR line IN 
      SELECT * FROM goods_receipt_lines WHERE grn_id = NEW.id
    LOOP
      -- A. Check if item exists in inventory_items by exact or similar name
      SELECT id INTO v_item_id FROM inventory_items 
      WHERE LOWER(name) = LOWER(line.item_description) OR LOWER(name_en) = LOWER(line.item_description)
      LIMIT 1;
      
      -- B. If it does not exist, create it dynamically
      IF v_item_id IS NULL THEN
        SELECT COALESCE(MAX(CAST(SPLIT_PART(code,'-',2) AS INT)),0)+1
        INTO seq FROM inventory_items WHERE code LIKE 'MAT-%';
        v_item_code := 'MAT-' || LPAD(seq::TEXT,3,'0');
        
        INSERT INTO inventory_items (code, name, category, unit, unit_cost_estimate, created_by)
        VALUES (v_item_code, line.item_description, 'material', line.unit, line.unit_price, NEW.received_by)
        RETURNING id INTO v_item_id;
      END IF;
      
      -- C. Insert into inventory_movements (Stock Ledger)
      INSERT INTO inventory_movements (
        project_id, item_id, movement_type, qty, unit_cost, 
        reference_type, reference_id, warehouse_location, created_by
      ) VALUES (
        NEW.project_id, v_item_id, 'in', line.qty_received, line.unit_price, 
        'grn', line.id, NEW.warehouse_location, NEW.received_by
      );
      
      -- D. Update/Upsert inventory_stock_balances
      INSERT INTO inventory_stock_balances (
        project_id, item_id, warehouse_location, qty_on_hand, avg_unit_cost, last_updated_at
      ) VALUES (
        NEW.project_id, v_item_id, NEW.warehouse_location, line.qty_received, line.unit_price, now()
      )
      ON CONFLICT (project_id, item_id, warehouse_location) DO UPDATE SET
        avg_unit_cost = CASE 
          WHEN (inventory_stock_balances.qty_on_hand + EXCLUDED.qty_on_hand) > 0 
          THEN ((inventory_stock_balances.qty_on_hand * inventory_stock_balances.avg_unit_cost) + (EXCLUDED.qty_on_hand * EXCLUDED.avg_unit_cost)) / (inventory_stock_balances.qty_on_hand + EXCLUDED.qty_on_hand)
          ELSE EXCLUDED.avg_unit_cost
        END,
        qty_on_hand = inventory_stock_balances.qty_on_hand + EXCLUDED.qty_on_hand,
        last_updated_at = now();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grn_to_inventory ON goods_receipts;
CREATE TRIGGER trg_grn_to_inventory
  AFTER UPDATE ON goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION process_grn_to_inventory();

-- ─────────────────────────────────────────────────────────────
-- 6. RLS POLICIES & SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_inv_items" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_inv_stock" ON inventory_stock_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_inv_move" ON inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_inv_trans" ON inventory_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 7. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_proj ON inventory_stock_balances(project_id);
CREATE INDEX IF NOT EXISTS idx_stock_item ON inventory_stock_balances(item_id);
CREATE INDEX IF NOT EXISTS idx_move_proj ON inventory_movements(project_id);
CREATE INDEX IF NOT EXISTS idx_move_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_trans_from ON inventory_transfers(from_project_id);
CREATE INDEX IF NOT EXISTS idx_trans_to ON inventory_transfers(to_project_id);

-- ─────────────────────────────────────────────────────────────
-- 8. SEED STANDARD CONSTRUCTION MATERIALS
-- ─────────────────────────────────────────────────────────────
INSERT INTO inventory_items (name, name_en, category, unit, unit_cost_estimate) VALUES
('أسمنت بورتلاندي عادي', 'Portland Cement OPC', 'cement', 'TON', 2100),
('حديد تسليح 12 مم', 'Deformed Steel Bars 12mm', 'steel', 'TON', 38000),
('حديد تسليح 16 مم', 'Deformed Steel Bars 16mm', 'steel', 'TON', 38000),
('رمل مغسول', 'Washed River Sand', 'sand_gravel', 'M3', 180),
('زلط مكسر (سن 2)', 'Crushed Gravel Size 2', 'sand_gravel', 'M3', 320),
('خرسانة جاهزة جهد 350', 'Ready-mix Concrete C350', 'cement', 'M3', 1350),
('طوب طفلي 20*10*6', 'Red Clay Bricks 20x10x6', 'finishing', 'PCS', 1.8),
('دهان بلاستيك داخلي مط', 'Matte Interior Emulsion Paint', 'finishing', 'BOX', 850)
ON CONFLICT DO NOTHING;
