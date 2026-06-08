-- =============================================
-- Phase 0: RLS Policies + New Tables Migration
-- ERP Contract Analysis Module
-- =============================================

-- ─── 1. Enable RLS on contracts table ───────────────
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "contracts_select_authenticated" ON public.contracts;
DROP POLICY IF EXISTS "contracts_insert_authenticated" ON public.contracts;
DROP POLICY IF EXISTS "contracts_update_authenticated" ON public.contracts;
DROP POLICY IF EXISTS "contracts_delete_authenticated" ON public.contracts;

-- Allow all authenticated users to read contracts
CREATE POLICY "contracts_select_authenticated" ON public.contracts 
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert contracts
CREATE POLICY "contracts_insert_authenticated" ON public.contracts 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to update contracts
CREATE POLICY "contracts_update_authenticated" ON public.contracts 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow all authenticated users to delete contracts
CREATE POLICY "contracts_delete_authenticated" ON public.contracts 
  FOR DELETE TO authenticated USING (true);


-- ─── 2. Enable RLS on ongoing_projects table ────────
ALTER TABLE public.ongoing_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_authenticated" ON public.ongoing_projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON public.ongoing_projects;
DROP POLICY IF EXISTS "projects_update_authenticated" ON public.ongoing_projects;
DROP POLICY IF EXISTS "projects_delete_authenticated" ON public.ongoing_projects;

CREATE POLICY "projects_select_authenticated" ON public.ongoing_projects 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_insert_authenticated" ON public.ongoing_projects 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "projects_update_authenticated" ON public.ongoing_projects 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "projects_delete_authenticated" ON public.ongoing_projects 
  FOR DELETE TO authenticated USING (true);


-- ─── 3. Storage bucket policies ─────────────────────
-- Allow authenticated users to upload to contracts bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'contracts_upload_authenticated', 'contracts', 'INSERT', 
  '(auth.role() = ''authenticated'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'contracts_upload_authenticated' AND bucket_id = 'contracts'
);

-- Allow authenticated users to read from contracts bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'contracts_select_authenticated', 'contracts', 'SELECT', 
  '(auth.role() = ''authenticated'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'contracts_select_authenticated' AND bucket_id = 'contracts'
);


-- ─── 4. Enable RLS on related tables ────────────────
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clauses_select_authenticated" ON public.contract_clauses;
DROP POLICY IF EXISTS "clauses_insert_authenticated" ON public.contract_clauses;
DROP POLICY IF EXISTS "clauses_update_authenticated" ON public.contract_clauses;
DROP POLICY IF EXISTS "clauses_delete_authenticated" ON public.contract_clauses;

CREATE POLICY "clauses_select_authenticated" ON public.contract_clauses 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clauses_insert_authenticated" ON public.contract_clauses 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clauses_update_authenticated" ON public.contract_clauses 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clauses_delete_authenticated" ON public.contract_clauses 
  FOR DELETE TO authenticated USING (true);


ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amendments_select_authenticated" ON public.contract_amendments;
DROP POLICY IF EXISTS "amendments_insert_authenticated" ON public.contract_amendments;
DROP POLICY IF EXISTS "amendments_update_authenticated" ON public.contract_amendments;
DROP POLICY IF EXISTS "amendments_delete_authenticated" ON public.contract_amendments;

CREATE POLICY "amendments_select_authenticated" ON public.contract_amendments 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "amendments_insert_authenticated" ON public.contract_amendments 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "amendments_update_authenticated" ON public.contract_amendments 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "amendments_delete_authenticated" ON public.contract_amendments 
  FOR DELETE TO authenticated USING (true);


-- ─── 5. New tables for Phase 0 ──────────────────────

-- 5a. Contract Risk Items (El-Osily 8-column format)
CREATE TABLE IF NOT EXISTS public.contract_risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  category TEXT NOT NULL,                    -- e.g., "Payment Terms", "Variations", "Termination"
  risk_description TEXT NOT NULL,            -- What the risk is
  current_wording TEXT,                      -- Current contract text
  required_wording TEXT,                     -- Suggested correction
  severity TEXT NOT NULL DEFAULT 'medium',   -- 'critical', 'high', 'medium'
  responsibility TEXT,                       -- Who is responsible
  status TEXT NOT NULL DEFAULT 'open',       -- 'open', 'resolved', 'accepted'
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_risk_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_items_select_authenticated" ON public.contract_risk_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_items_insert_authenticated" ON public.contract_risk_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "risk_items_update_authenticated" ON public.contract_risk_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "risk_items_delete_authenticated" ON public.contract_risk_items FOR DELETE TO authenticated USING (true);


-- 5b. Contract Review Checklist (19-item standard)
CREATE TABLE IF NOT EXISTS public.contract_review_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  checklist_item TEXT NOT NULL,              -- e.g., "Advance Payment Guarantee"
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pass', 'fail', 'pending', 'not_applicable'
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  ai_assessment TEXT,                        -- AI's initial assessment
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_review_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_select_authenticated" ON public.contract_review_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_insert_authenticated" ON public.contract_review_checklist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "checklist_update_authenticated" ON public.contract_review_checklist FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "checklist_delete_authenticated" ON public.contract_review_checklist FOR DELETE TO authenticated USING (true);


-- 5c. Contract Project Config (8 project types)
CREATE TABLE IF NOT EXISTS public.contract_project_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT UNIQUE NOT NULL,         -- e.g., "buildings", "infrastructure", "oil_gas"
  display_name_ar TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  risk_weights JSONB,                        -- Custom risk scoring weights per project type
  checklist_overrides JSONB,                 -- Custom checklist items per project type
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_project_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_config_select_authenticated" ON public.contract_project_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_config_insert_admin" ON public.contract_project_config FOR INSERT TO authenticated WITH CHECK (true);

-- Insert the 8 standard project types
INSERT INTO public.contract_project_config (project_type, display_name_ar, display_name_en) VALUES
  ('buildings', 'مباني سكنية/تجارية', 'Buildings (Residential/Commercial)'),
  ('infrastructure', 'بنية تحتية', 'Infrastructure'),
  ('oil_gas', 'نفط وغاز', 'Oil & Gas'),
  ('water_treatment', 'محطات معالجة مياه', 'Water Treatment Plants'),
  ('power_energy', 'طاقة وكهرباء', 'Power & Energy'),
  ('industrial', 'منشآت صناعية', 'Industrial Facilities'),
  ('marine_coastal', 'أعمال بحرية وساحلية', 'Marine & Coastal Works'),
  ('renovation', 'ترميم وتجديد', 'Renovation & Refurbishment')
ON CONFLICT (project_type) DO NOTHING;


-- ─── 6. Add new columns to contracts table ──────────
DO $$ 
BEGIN
  -- Add analysis_version column for caching
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'analysis_version') THEN
    ALTER TABLE public.contracts ADD COLUMN analysis_version INTEGER DEFAULT 0;
  END IF;
  
  -- Add project_type column for AI analysis context
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'project_type_config') THEN
    ALTER TABLE public.contracts ADD COLUMN project_type_config TEXT REFERENCES public.contract_project_config(project_type);
  END IF;

  -- Add risk_score column for dashboard
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'risk_score') THEN
    ALTER TABLE public.contracts ADD COLUMN risk_score NUMERIC(5,2);
  END IF;

  -- Add checklist_completion column for progress bar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'checklist_completion') THEN
    ALTER TABLE public.contracts ADD COLUMN checklist_completion NUMERIC(5,2) DEFAULT 0;
  END IF;
END $$;
