-- Add BOQ data column to contracts table
-- Stores extracted BOQ items as JSONB array
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS boq_data jsonb DEFAULT '[]'::jsonb;

-- Add AI analysis results column if not exists
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS ai_analysis_results jsonb DEFAULT '{}'::jsonb;

-- Add AI analyzed_at timestamp
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;

COMMENT ON COLUMN public.contracts.boq_data IS 'Extracted BOQ items as JSON array. Each item has type (section/item), item_no, name, scope, unit, quantity, total.';
