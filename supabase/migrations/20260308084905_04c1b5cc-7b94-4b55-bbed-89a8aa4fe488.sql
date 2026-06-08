-- Add markup/profit percentage per BOQ item for granular profit control
ALTER TABLE public.cost_breakdown_items 
  ADD COLUMN markup_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN selling_rate NUMERIC(14,2) GENERATED ALWAYS AS (unit_rate * (1 + COALESCE(markup_pct, 0) / 100)) STORED,
  ADD COLUMN selling_total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_rate * (1 + COALESCE(markup_pct, 0) / 100)) STORED;
