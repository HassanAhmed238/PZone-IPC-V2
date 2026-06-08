-- =============================================
-- CONTRACT ANALYSIS MODULE — PHASE 1
-- Tables: contracts, contract_clauses,
--         contract_amendments, contract_module_access
-- Storage: contracts bucket
-- =============================================

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE public.contract_type_enum AS ENUM (
  'FIDIC_RED',       -- FIDIC Conditions of Contract for Construction (Red Book)
  'FIDIC_YELLOW',    -- FIDIC Plant and Design-Build (Yellow Book)
  'FIDIC_SILVER',    -- FIDIC EPC/Turnkey (Silver Book)
  'FIDIC_GREEN',     -- FIDIC Short Form
  'EGYPTIAN_LAW',    -- Egyptian Civil Code & relevant laws
  'CUSTOM'           -- Custom / hybrid contract
);

CREATE TYPE public.governing_law_enum AS ENUM (
  'egyptian',
  'international',
  'mixed'
);

CREATE TYPE public.contract_status_enum AS ENUM (
  'draft',
  'active',
  'under_amendment',
  'suspended',
  'completed',
  'terminated',
  'archived'
);

CREATE TYPE public.clause_type_enum AS ENUM (
  -- FIDIC standard clause types
  'general_conditions',
  'employer_obligations',
  'contractor_obligations',
  'contract_price',
  'payment_terms',
  'advance_payment',
  'retention',
  'variations',
  'claims',
  'liquidated_damages',
  'force_majeure',
  'termination',
  'defects_liability',
  'insurance',
  'dispute_resolution',
  'subcontracting',
  -- Egyptian law additions
  'commercial_registry',
  'tax_compliance',
  'performance_bond',
  'arbitration_egypt',
  'other'
);

-- ─────────────────────────────────────────────
-- TABLE: contracts
-- ─────────────────────────────────────────────

CREATE TABLE public.contracts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid REFERENCES public.ongoing_projects(id) ON DELETE SET NULL,
  title               text NOT NULL,
  contract_number     text,
  contract_type       public.contract_type_enum NOT NULL DEFAULT 'FIDIC_RED',
  governing_law       public.governing_law_enum NOT NULL DEFAULT 'egyptian',
  status              public.contract_status_enum NOT NULL DEFAULT 'draft',
  -- Parties
  employer_name       text,
  contractor_name     text,
  -- Financials
  contract_value      numeric(18,2),
  currency            text DEFAULT 'EGP',
  -- Dates
  effective_date      date,
  expiry_date         date,
  defects_liability_end date,
  -- File
  file_url            text,
  original_filename   text,
  file_size_bytes     bigint,
  -- AI extraction status
  ai_extracted        boolean DEFAULT false,
  ai_extracted_at     timestamptz,
  -- Audit
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- TABLE: contract_clauses
-- ─────────────────────────────────────────────

CREATE TABLE public.contract_clauses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  clause_number   text,                          -- e.g. "14.3" or "Sub-Clause 47"
  clause_title    text,
  clause_body     text NOT NULL,
  clause_type     public.clause_type_enum NOT NULL DEFAULT 'other',
  -- Risk flags
  is_flagged      boolean NOT NULL DEFAULT false,
  flag_note       text,
  -- Source
  source          text DEFAULT 'manual',         -- 'manual' | 'ai_extracted'
  page_reference  text,                          -- e.g. "Page 12, Section 3"
  sort_order      int DEFAULT 0,
  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- TABLE: contract_amendments
-- ─────────────────────────────────────────────

CREATE TABLE public.contract_amendments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  amendment_number int NOT NULL DEFAULT 1,
  title            text NOT NULL,
  description      text,
  effective_date   date,
  -- File
  file_url         text,
  original_filename text,
  -- Impact tracking
  affected_clauses text[],                       -- array of clause_numbers impacted
  value_change     numeric(18,2),                -- positive = increase, negative = decrease
  -- Audit
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, amendment_number)
);

-- ─────────────────────────────────────────────
-- TABLE: contract_module_access
-- Replaces the hardcoded moduleAccess map in AppSidebar.tsx
-- ─────────────────────────────────────────────

CREATE TABLE public.contract_module_access (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_path   text NOT NULL UNIQUE,            -- e.g. "/contracts", "/budget"
  module_label  text NOT NULL,
  allowed_roles text[] NOT NULL DEFAULT '{}',    -- e.g. '{"admin","cost_control","ceo"}'
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed with existing module routes + new /contracts
INSERT INTO public.contract_module_access (module_path, module_label, allowed_roles) VALUES
  ('/',               'Dashboard',             '{"all"}'),
  ('/tenders',        'Tender & Estimation',   '{"all"}'),
  ('/budget',         'Budget',                '{"admin","cost_control","estimator","finance","ceo","chairman"}'),
  ('/contracts',      'Contract Analysis',     '{"admin","cost_control","ceo","chairman"}'),
  ('/projects',       'Project Setup',         '{"admin","project_manager","ceo","chairman"}'),
  ('/procurement',    'Procurement',           '{"admin","procurement","project_manager","ceo"}'),
  ('/inventory',      'Inventory',             '{"admin","inventory","procurement","project_manager"}'),
  ('/site-progress',  'Site Progress',         '{"admin","site_engineer","project_manager","ceo"}'),
  ('/cost-control',   'Cost Control',          '{"admin","cost_control","finance","ceo","chairman"}'),
  ('/invoices',       'Client Invoices',       '{"admin","finance","ceo","chairman"}'),
  ('/collections',    'Collections',           '{"admin","finance","ceo","chairman"}'),
  ('/payments',       'Contractor Payments',   '{"admin","finance","ceo","chairman"}'),
  ('/cash-flow',      'Cash Flow',             '{"admin","finance","ceo","chairman"}'),
  ('/executive',      'Executive Dashboard',   '{"admin","ceo","chairman"}'),
  ('/master-data',    'Master Data',           '{"admin"}'),
  ('/user-management','User Management',       '{"admin"}');

-- ─────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────

-- contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contracts"
  ON public.contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cost control and above can insert contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'ceo'::app_role) OR
    public.has_role(auth.uid(), 'chairman'::app_role)
  );

CREATE POLICY "Cost control and above can update contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'ceo'::app_role) OR
    public.has_role(auth.uid(), 'chairman'::app_role)
  );

CREATE POLICY "Admins can delete contracts"
  ON public.contracts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- contract_clauses
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contract_clauses"
  ON public.contract_clauses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cost control and above can manage contract_clauses"
  ON public.contract_clauses FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'ceo'::app_role) OR
    public.has_role(auth.uid(), 'chairman'::app_role)
  );

-- contract_amendments
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contract_amendments"
  ON public.contract_amendments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cost control and above can manage contract_amendments"
  ON public.contract_amendments FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'cost_control'::app_role) OR
    public.has_role(auth.uid(), 'ceo'::app_role) OR
    public.has_role(auth.uid(), 'chairman'::app_role)
  );

-- contract_module_access
ALTER TABLE public.contract_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contract_module_access"
  ON public.contract_module_access FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage contract_module_access"
  ON public.contract_module_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────
-- updated_at TRIGGERS
-- ─────────────────────────────────────────────

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_clauses_updated_at
  BEFORE UPDATE ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_amendments_updated_at
  BEFORE UPDATE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_module_access_updated_at
  BEFORE UPDATE ON public.contract_module_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────
-- INDEXES (for common query patterns)
-- ─────────────────────────────────────────────

CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contract_clauses_contract_id ON public.contract_clauses(contract_id);
CREATE INDEX idx_contract_clauses_type ON public.contract_clauses(clause_type);
CREATE INDEX idx_contract_amendments_contract_id ON public.contract_amendments(contract_id);

-- ─────────────────────────────────────────────
-- STORAGE BUCKET
-- Note: Run this in the Supabase dashboard SQL editor or via CLI
-- as storage.buckets requires service_role access
-- ─────────────────────────────────────────────

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'contracts',
--   'contracts',
--   false,                                   -- Private bucket
--   52428800,                                -- 50 MB limit per file
--   ARRAY['application/pdf',
--         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--         'application/msword']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS (run separately in dashboard):
-- CREATE POLICY "Authenticated users can upload contracts"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'contracts');
--
-- CREATE POLICY "Authenticated users can view contracts"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'contracts');
--
-- CREATE POLICY "Admins can delete contracts from storage"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'::app_role));
