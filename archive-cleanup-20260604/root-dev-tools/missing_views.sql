-- ==========================================
-- missing_views_and_migration.sql
-- ==========================================

-- 1. VIEW: boq_site_progress — For site engineers (NO MONEY)
CREATE OR REPLACE VIEW public.boq_site_progress AS
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
  COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0) AS approved_cumulative_qty,
  COALESCE(SUM(dp.qty_today), 0) AS total_cumulative_qty,
  CASE WHEN b.contract_qty > 0
    THEN ROUND(COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0) / b.contract_qty * 100, 2)
    ELSE 0
  END AS progress_pct,
  b.contract_qty - COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0) AS remaining_qty,
  COALESCE(SUM(dp.qty_today) FILTER (WHERE dp.status = 'approved'), 0) - COALESCE(SUM(dp.planned_qty), 0) AS qty_variance_vs_plan,
  MAX(dp.progress_date)  AS last_progress_date,
  COUNT(dp.id)           AS entry_count,
  COUNT(dp.id) FILTER (WHERE dp.status = 'submitted') AS pending_approval_count
FROM public.boq_items b
LEFT JOIN public.daily_progress dp ON dp.boq_item_id = b.id
WHERE b.is_active = true
GROUP BY b.id;

-- 2. VIEW: boq_cost_progress — For cost control (WITH financials)
CREATE OR REPLACE VIEW public.boq_cost_progress AS
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
  b.unit_rate,
  b.total_amount                                     AS contract_amount,
  bsp.approved_cumulative_qty * b.unit_rate           AS earned_value,
  b.contract_qty * b.unit_rate                        AS total_value,
  bl.budget_qty,
  bl.direct_cost_total                                AS budget_amount,
  bsp.approved_cumulative_qty - COALESCE(bl.budget_qty, 0) AS qty_variance_vs_budget
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

-- 3. MIGRATION FUNCTION: contracts.boq_data JSONB → boq_items
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

-- 4. Backfill budget_lines.boq_item_id
UPDATE public.budget_lines bl
SET boq_item_id = bq.id
FROM public.boq_items bq
WHERE bl.project_id = bq.project_id
  AND bl.cost_code IS NOT NULL
  AND bl.cost_code = bq.cost_code
  AND bl.boq_item_id IS NULL;
