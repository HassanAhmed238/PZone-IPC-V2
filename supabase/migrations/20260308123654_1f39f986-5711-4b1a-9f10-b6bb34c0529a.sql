
-- Add missing columns to ongoing_projects table
ALTER TABLE public.ongoing_projects 
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS project_type text CHECK (project_type IN ('construction','fit_out','infrastructure','maintenance','design_build')),
  ADD COLUMN IF NOT EXISTS sector text CHECK (sector IN ('commercial','residential','industrial','government','hospitality')),
  ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'lump_sum' CHECK (contract_type IN ('lump_sum','remeasured','cost_plus','design_build')),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS retention_pct numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS advance_payment_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defects_liability_period integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS completion_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tender_id uuid REFERENCES public.tenders(id),
  ADD COLUMN IF NOT EXISTS budget_header_id uuid REFERENCES public.budget_headers(id),
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS actual_end_date date,
  ADD COLUMN IF NOT EXISTS duration_days integer;

-- Create project_role enum
DO $$ BEGIN
  CREATE TYPE project_role AS ENUM ('pm','deputy_pm','site_engineer','cost_controller','procurement_officer','qc_engineer','safety_officer','document_controller');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create project_access_level enum
DO $$ BEGIN
  CREATE TYPE project_access_level AS ENUM ('full','read_only','limited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create milestone_type enum
DO $$ BEGIN
  CREATE TYPE milestone_type AS ENUM ('date_based','progress_based','deliverable_based');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create milestone_status enum
DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending','triggered','invoiced','paid','overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create document_category enum
DO $$ BEGIN
  CREATE TYPE document_category AS ENUM ('contract','drawing','specification','boq','permit','insurance','correspondence','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create project_wbs table
CREATE TABLE IF NOT EXISTS public.project_wbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.project_wbs(id) ON DELETE CASCADE,
  wbs_code text,
  level integer DEFAULT 1,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  duration integer,
  weight_pct numeric DEFAULT 0,
  budget_line_id uuid REFERENCES public.budget_lines(id),
  responsible uuid,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  milestone_code text,
  name text NOT NULL,
  description text,
  milestone_type milestone_type DEFAULT 'progress_based',
  trigger_date date,
  trigger_progress numeric,
  trigger_deliverable text,
  invoice_amount numeric DEFAULT 0,
  invoice_pct numeric,
  advance_deduction numeric DEFAULT 0,
  retention_amount numeric DEFAULT 0,
  net_payable numeric DEFAULT 0,
  planned_date date,
  actual_date date,
  status milestone_status DEFAULT 'pending',
  invoice_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_team table
CREATE TABLE IF NOT EXISTS public.project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_in_project project_role NOT NULL,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  access_level project_access_level DEFAULT 'full',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id, role_in_project)
);

-- Create project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  category document_category DEFAULT 'other',
  title text NOT NULL,
  doc_number text,
  revision text DEFAULT 'Rev.0',
  file_url text,
  file_size integer,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT true
);

-- Enable RLS on new tables
ALTER TABLE public.project_wbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS for project_wbs
CREATE POLICY "Authenticated users can view project_wbs"
  ON public.project_wbs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can manage project_wbs"
  ON public.project_wbs FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'cost_control'::app_role)
  );

-- RLS for project_milestones
CREATE POLICY "Authenticated users can view project_milestones"
  ON public.project_milestones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can manage project_milestones"
  ON public.project_milestones FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'finance'::app_role) OR
    has_role(auth.uid(), 'ceo'::app_role)
  );

-- RLS for project_team
CREATE POLICY "Authenticated users can view project_team"
  ON public.project_team FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and PM can manage project_team"
  ON public.project_team FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'ceo'::app_role)
  );

-- RLS for project_documents
CREATE POLICY "Authenticated users can view project_documents"
  ON public.project_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can manage project_documents"
  ON public.project_documents FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'cost_control'::app_role) OR
    has_role(auth.uid(), 'site_engineer'::app_role)
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_wbs_project ON public.project_wbs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user ON public.project_team(user_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON public.project_documents(project_id);
