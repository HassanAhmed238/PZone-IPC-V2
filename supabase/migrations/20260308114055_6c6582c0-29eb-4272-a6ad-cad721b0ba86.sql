-- Fix security definer view by adding security_invoker
DROP VIEW IF EXISTS public.cost_control_baseline;

CREATE VIEW public.cost_control_baseline
WITH (security_invoker = on) AS
SELECT 
    bl.project_id,
    bl.discipline,
    bl.activity,
    bl.cost_code,
    bl.description,
    bl.unit,
    bl.budget_qty,
    bl.direct_cost_total,
    bl.indirect_amount,
    bl.line_total as budget_amount,
    bh.status as budget_status,
    bh.approved_at,
    bh.id as budget_header_id
FROM public.budget_lines bl
JOIN public.budget_headers bh ON bl.budget_header_id = bh.id
WHERE bh.status = 'locked';