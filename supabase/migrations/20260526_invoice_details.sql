-- Add columns for deductions breakdown, variations, fluctuation, and invoice linking
-- Run this in Supabase SQL Editor

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fluctuation_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_deductions_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_variations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_fluctuation_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_submitted_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Index for linking
CREATE INDEX IF NOT EXISTS idx_invoices_linked ON public.invoices(linked_submitted_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(invoice_type);
