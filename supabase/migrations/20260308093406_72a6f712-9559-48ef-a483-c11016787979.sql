
-- Add new cost structure columns to cost_breakdown_items
ALTER TABLE public.cost_breakdown_items
  ADD COLUMN IF NOT EXISTS item_no text,
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS supply_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS install_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxes_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS indirect_cost_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_code text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS origin text;

-- Add indirect cost and exchange rate fields to tenders
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS commission_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxes_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_expenses_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate_eur numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_fees_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customs_fees_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_pct numeric DEFAULT 14;
