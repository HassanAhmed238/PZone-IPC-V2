-- ============================================================
-- P-Zone ERP — Contracts OCR Cache Schema Addition
-- ============================================================

-- Add extracted_text_ocr column to public.contracts to permanently store local OCR read text
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS extracted_text_ocr TEXT;
