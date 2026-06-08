-- =============================================
-- SITE PROGRESS MODULE — Database Migration
-- Tables: boq_items, daily_site_logs,
--         daily_progress, daily_progress_photos
-- Views:  boq_site_progress, boq_cost_progress
-- =============================================

-- ─────────────────────────────────────────────
-- 1. TABLE: boq_items — Hierarchical BOQ with cost_code & variation tracking
-- ─────────────────────────────────────────────

CREATE TABLE public.boq_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES public.boq_items(id) ON DELETE CASCADE,
  contract_id   uuid REFERENCES public.contracts(id) ON DELETE SET NULL,

  -- Universal linking key
  cost_code     text NOT NULL,

  -- BOQ structure
  item_no       text NOT NULL,
  section       text,
  description   text NOT NULL,
  unit          text,

  -- Hierarchy level: 0=section, 1=sub-section, 2=item
  level         int NOT NULL DEFAULT 0,

  -- Quantities & rates
  contract_qty  numeric(14,3) DEFAULT 0,
  unit_rate     numeric(14,2) DEFAULT 0,
  total_amount  numeric(18,2) GENERATED ALWAYS AS (contract_qty * unit_rate) STORED,

  -- Source tracking
  source_type   text NOT NULL DEFAULT 'original'
                CHECK (source_type IN ('original', 'variation')),
  variation_no  text,

  -- Metadata
  sort_order    int DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  UNIQUE(project_id, item_no)
);

-- Indexes
CREATE INDEX idx_boq_items_project ON public.boq_items(project_id);
CREATE INDEX idx_boq_items_parent ON public.boq_items(parent_id);
CREATE INDEX idx_boq_items_cost_code ON public.boq_items(project_id, cost_code);
CREATE INDEX idx_boq_items_variation ON public.boq_items(project_id, variation_no)
  WHERE variation_no IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER update_boq_items_updated_at
  BEFORE UPDATE ON public.boq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────
-- 2. TABLE: daily_site_logs — One log per project per day per shift
-- ─────────────────────────────────────────────

CREATE TABLE public.daily_site_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  log_date      date NOT NULL,

  -- Shift
  shift         text NOT NULL DEFAULT 'day'
                CHECK (shift IN ('day', 'night')),

  -- Force majeure documentation only
  force_majeure_weather text,

  -- Workforce
  workers_count int DEFAULT 0,
  equipment_notes text,

  -- Status workflow
  general_notes text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  logged_by     uuid NOT NULL REFERENCES auth.users(id),
  approved_by   uuid REFERENCES auth.users(id),
  approved_at   timestamptz,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  UNIQUE(project_id, log_date, shift)
);

-- Indexes
CREATE INDEX idx_daily_site_logs_project_date
  ON public.daily_site_logs(project_id, log_date DESC);
CREATE INDEX idx_daily_site_logs_status
  ON public.daily_site_logs(status)
  WHERE status IN ('draft', 'submitted');

-- updated_at trigger
CREATE TRIGGER update_daily_site_logs_updated_at
  BEFORE UPDATE ON public.daily_site_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────
-- 3. TABLE: daily_progress — Site engineer input (quantities, no money)
-- ─────────────────────────────────────────────

CREATE TABLE public.daily_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id   uuid NOT NULL REFERENCES public.daily_site_logs(id) ON DELETE CASCADE,
  boq_item_id    uuid NOT NULL REFERENCES public.boq_items(id) ON DELETE RESTRICT,
  project_id     uuid NOT NULL REFERENCES public.ongoing_projects(id),

  -- Cost code denormalized for fast cross-module joins
  cost_code      text NOT NULL,

  -- Site engineer input
  progress_date  date NOT NULL,
  qty_today      numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_today >= 0),

  -- Planning link (for S-curve variance)
  planned_qty    numeric(14,3) DEFAULT 0,

  -- Location & context
  location       text,
  remarks        text,

  -- Approval workflow
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  recorded_by    uuid NOT NULL REFERENCES auth.users(id),
  approved_by    uuid REFERENCES auth.users(id),
  approved_at    timestamptz,
  rejection_note text,

  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_progress_boq ON public.daily_progress(boq_item_id);
CREATE INDEX idx_daily_progress_project_date ON public.daily_progress(project_id, progress_date DESC);
CREATE INDEX idx_daily_progress_cost_code ON public.daily_progress(project_id, cost_code);
CREATE INDEX idx_daily_progress_status ON public.daily_progress(status)
  WHERE status IN ('draft', 'submitted');
CREATE INDEX idx_daily_progress_log ON public.daily_progress(daily_log_id);

-- updated_at trigger
CREATE TRIGGER update_daily_progress_updated_at
  BEFORE UPDATE ON public.daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────
-- 4. TABLE: daily_progress_photos — Evidence attachments
-- ─────────────────────────────────────────────

CREATE TABLE public.daily_progress_photos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_progress_id   uuid NOT NULL REFERENCES public.daily_progress(id) ON DELETE CASCADE,
  file_url            text NOT NULL,
  caption             text,
  uploaded_by         uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_progress_photos_progress
  ON public.daily_progress_photos(daily_progress_id);


-- ─────────────────────────────────────────────
-- 5. Add boq_item_id FK to budget_lines
-- ─────────────────────────────────────────────

ALTER TABLE public.budget_lines
  ADD COLUMN IF NOT EXISTS boq_item_id uuid
  REFERENCES public.boq_items(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────
-- 6. RLS POLICIES
-- ─────────────────────────────────────────────

-- ── boq_items ──
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view boq_items"
  ON public.boq_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can insert boq_items"
  ON public.boq_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'project_manager'::app_role) OR
    public.has_role(auth.uid(), 'site_engineer'::app_role)
  );

CREATE POLICY "Authorized users can update boq_items"
  ON public.boq_items FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Admin can delete boq_items"
  ON public.boq_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── daily_site_logs ──
ALTER TABLE public.daily_site_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view daily_site_logs"
  ON public.daily_site_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Site engineers can insert daily_site_logs"
  ON public.daily_site_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = logged_by AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'site_engineer'::app_role) OR
      public.has_role(auth.uid(), 'project_manager'::app_role)
    )
  );

CREATE POLICY "Authors and managers can update daily_site_logs"
  ON public.daily_site_logs FOR UPDATE TO authenticated
  USING (
    auth.uid() = logged_by OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Admin can delete daily_site_logs"
  ON public.daily_site_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── daily_progress ──
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view daily_progress"
  ON public.daily_progress FOR SELECT TO authenticated USING (true);

CREATE POLICY "Site engineers can insert daily_progress"
  ON public.daily_progress FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = recorded_by AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'site_engineer'::app_role) OR
      public.has_role(auth.uid(), 'project_manager'::app_role)
    )
  );

CREATE POLICY "Authors and managers can update daily_progress"
  ON public.daily_progress FOR UPDATE TO authenticated
  USING (
    -- Author can update drafts, managers can approve/reject
    (auth.uid() = recorded_by AND status IN ('draft', 'rejected')) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Admin can delete daily_progress"
  ON public.daily_progress FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── daily_progress_photos ──
ALTER TABLE public.daily_progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view daily_progress_photos"
  ON public.daily_progress_photos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert daily_progress_photos"
  ON public.daily_progress_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'site_engineer'::app_role) OR
    public.has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Admin can delete daily_progress_photos"
  ON public.daily_progress_photos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ─────────────────────────────────────────────
-- 7. VIEW: boq_site_progress — For site engineers (NO MONEY)
-- ─────────────────────────────────────────────

CREATE VIEW public.boq_site_progress AS
SELECT
  b.id                   AS boq_item_id,
  b.project_id,
  b.cost_code,
  b.item_no,
  b.parent_id,
  b.section,
  b.description,
  b.unit,
  b.level,
  b.source_type,
  b.variation_no,
  b.contract_qty,

  -- Cumulative progress (approved only)
  COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0)
    AS approved_cumulative_qty,

  -- Cumulative including pending
  COALESCE(SUM(dp.qty_today), 0)
    AS total_cumulative_qty,

  -- Progress percentage (based on approved)
  CASE WHEN b.contract_qty > 0
    THEN ROUND(
      COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0)
      / b.contract_qty * 100, 2)
    ELSE 0
  END AS progress_pct,

  -- Remaining
  b.contract_qty - COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0)
    AS remaining_qty,

  -- Planning variance
  COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0)
    - COALESCE(SUM(dp.planned_qty), 0)
    AS qty_variance_vs_plan,

  -- Activity info
  MAX(dp.progress_date)  AS last_progress_date,
  COUNT(dp.id)           AS entry_count,
  COUNT(dp.id) FILTER (WHERE dp.status = 'submitted') AS pending_approval_count

FROM public.boq_items b
LEFT JOIN public.daily_progress dp ON dp.boq_item_id = b.id
WHERE b.is_active = true
GROUP BY b.id;


-- ─────────────────────────────────────────────
-- 8. VIEW: boq_cost_progress — For cost control (WITH financials & budget variance)
-- ─────────────────────────────────────────────

CREATE VIEW public.boq_cost_progress AS
SELECT
  bsp.boq_item_id,
  bsp.project_id,
  bsp.cost_code,
  bsp.item_no,
  bsp.section,
  bsp.description,
  bsp.unit,
  bsp.level,
  bsp.source_type,
  bsp.variation_no,
  bsp.contract_qty,
  bsp.approved_cumulative_qty,
  bsp.total_cumulative_qty,
  bsp.progress_pct,
  bsp.remaining_qty,
  bsp.qty_variance_vs_plan,
  bsp.last_progress_date,
  bsp.entry_count,
  bsp.pending_approval_count,

  -- Financial (from boq_items)
  b.unit_rate,
  b.total_amount                                     AS contract_amount,
  bsp.approved_cumulative_qty * b.unit_rate           AS earned_value,
  b.contract_qty * b.unit_rate                        AS total_value,

  -- Budget data (via cost_code join)
  bl.budget_qty,
  bl.direct_cost_total                                AS budget_amount,
  bsp.approved_cumulative_qty - COALESCE(bl.budget_qty, 0)
                                                      AS qty_variance_vs_budget

FROM public.boq_site_progress bsp
JOIN public.boq_items b ON b.id = bsp.boq_item_id
LEFT JOIN public.budget_lines bl
  ON bl.project_id = bsp.project_id
  AND bl.cost_code = bsp.cost_code
  AND bl.budget_header_id = (
    SELECT bh.id FROM public.budget_headers bh
    WHERE bh.project_id = bsp.project_id
      AND bh.status IN ('approved', 'locked')
    ORDER BY bh.version DESC LIMIT 1
  );


-- ─────────────────────────────────────────────
-- 9. MIGRATION FUNCTION: contracts.boq_data JSONB → boq_items
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.migrate_contract_boq_to_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  item RECORD;
  sort_idx INT;
BEGIN
  FOR rec IN
    SELECT c.id AS contract_id, c.project_id, c.boq_data
    FROM contracts c
    WHERE c.project_id IS NOT NULL
      AND c.boq_data IS NOT NULL
      AND jsonb_array_length(c.boq_data) > 0
      AND NOT EXISTS (
        SELECT 1 FROM boq_items bi WHERE bi.contract_id = c.id LIMIT 1
      )
  LOOP
    sort_idx := 0;
    FOR item IN
      SELECT * FROM jsonb_array_elements(rec.boq_data) AS elem
    LOOP
      sort_idx := sort_idx + 1;
      INSERT INTO boq_items (
        project_id, contract_id, cost_code, item_no,
        section, description, unit, contract_qty, unit_rate,
        level, source_type, sort_order
      ) VALUES (
        rec.project_id,
        rec.contract_id,
        COALESCE(item.elem->>'item_no', 'UNK-' || sort_idx),
        COALESCE(item.elem->>'item_no', sort_idx::text),
        item.elem->>'name',
        COALESCE(item.elem->>'scope', item.elem->>'name', 'Unnamed item'),
        item.elem->>'unit',
        COALESCE((item.elem->>'quantity')::numeric, 0),
        CASE
          WHEN COALESCE((item.elem->>'quantity')::numeric, 0) > 0
          THEN COALESCE((item.elem->>'total')::numeric, 0) / (item.elem->>'quantity')::numeric
          ELSE 0
        END,
        CASE WHEN item.elem->>'type' = 'section' THEN 0 ELSE 2 END,
        'original',
        sort_idx
      )
      ON CONFLICT (project_id, item_no) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Run migration immediately
SELECT public.migrate_contract_boq_to_items();


-- ─────────────────────────────────────────────
-- 10. Backfill budget_lines.boq_item_id via cost_code
-- ─────────────────────────────────────────────

UPDATE public.budget_lines bl
SET boq_item_id = bq.id
FROM public.boq_items bq
WHERE bl.project_id = bq.project_id
  AND bl.cost_code IS NOT NULL
  AND bl.cost_code = bq.cost_code
  AND bl.boq_item_id IS NULL;
