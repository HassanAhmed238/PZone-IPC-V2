
-- Migration: 20260308083504_eea5bbed-7ec2-48d6-87e7-6e9de718f073.sql
-- Create enum for the 10 ERP roles
CREATE TYPE public.app_role AS ENUM (
  'chairman', 'ceo', 'finance', 'project_manager',
  'estimator', 'cost_control', 'procurement', 'inventory',
  'site_engineer', 'admin'
);

-- Create user_roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260308084108_f244db78-470e-4818-a918-26bb0113699c.sql
-- Tender status enum
CREATE TYPE public.tender_status AS ENUM ('draft', 'submitted', 'won', 'lost');

-- Cost item type enum
CREATE TYPE public.cost_item_type AS ENUM ('material', 'labor', 'equipment', 'subcontract', 'overhead', 'risk', 'contingency');

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and finance can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'ceo'));

-- Tenders table
CREATE TABLE public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT,
  scope TEXT,
  submission_date DATE,
  estimator_id UUID REFERENCES auth.users(id),
  status tender_status NOT NULL DEFAULT 'draft',
  overhead_pct NUMERIC(5,2) DEFAULT 0,
  risk_pct NUMERIC(5,2) DEFAULT 0,
  contingency_pct NUMERIC(5,2) DEFAULT 0,
  profit_margin_pct NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tenders"
  ON public.tenders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tenders"
  ON public.tenders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator and admins can update tenders"
  ON public.tenders FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "Admins can delete tenders"
  ON public.tenders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cost Breakdown Structure items (CBS tree)
CREATE TABLE public.cost_breakdown_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.cost_breakdown_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_type cost_item_type,
  unit TEXT,
  quantity NUMERIC(12,3) DEFAULT 0,
  unit_rate NUMERIC(14,2) DEFAULT 0,
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  sort_order INT DEFAULT 0,
  level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_breakdown_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CBS items"
  ON public.cost_breakdown_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert CBS items"
  ON public.cost_breakdown_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update CBS items"
  ON public.cost_breakdown_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete CBS items"
  ON public.cost_breakdown_items FOR DELETE TO authenticated USING (true);

-- Tender status history
CREATE TABLE public.tender_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE NOT NULL,
  old_status tender_status,
  new_status tender_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tender_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history"
  ON public.tender_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert status history"
  ON public.tender_status_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);

-- Auto-generate tender number
CREATE OR REPLACE FUNCTION public.generate_tender_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(tender_number FROM 5) AS INT)), 0) + 1
  INTO next_num FROM public.tenders;
  NEW.tender_number := 'TND-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tender_number
  BEFORE INSERT ON public.tenders
  FOR EACH ROW
  WHEN (NEW.tender_number IS NULL OR NEW.tender_number = '')
  EXECUTE FUNCTION public.generate_tender_number();

-- Updated_at triggers
CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cbs_updated_at
  BEFORE UPDATE ON public.cost_breakdown_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260308084118_20a71614-3a49-4dfc-b0a1-9e434a525f1f.sql
-- Fix overly permissive CBS policies by scoping to tender ownership
DROP POLICY "Authenticated users can insert CBS items" ON public.cost_breakdown_items;
DROP POLICY "Authenticated users can update CBS items" ON public.cost_breakdown_items;
DROP POLICY "Authenticated users can delete CBS items" ON public.cost_breakdown_items;

CREATE POLICY "Users can insert CBS items for their tenders"
  ON public.cost_breakdown_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenders
      WHERE tenders.id = tender_id
      AND (tenders.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'estimator'))
    )
  );

CREATE POLICY "Users can update CBS items for their tenders"
  ON public.cost_breakdown_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders
      WHERE tenders.id = tender_id
      AND (tenders.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'estimator'))
    )
  );

CREATE POLICY "Users can delete CBS items for their tenders"
  ON public.cost_breakdown_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders
      WHERE tenders.id = tender_id
      AND (tenders.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'estimator'))
    )
  );


-- Migration: 20260308084905_04c1b5cc-7b94-4b55-bbed-89a8aa4fe488.sql
-- Add markup/profit percentage per BOQ item for granular profit control
ALTER TABLE public.cost_breakdown_items 
  ADD COLUMN markup_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN selling_rate NUMERIC(14,2) GENERATED ALWAYS AS (unit_rate * (1 + COALESCE(markup_pct, 0) / 100)) STORED,
  ADD COLUMN selling_total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_rate * (1 + COALESCE(markup_pct, 0) / 100)) STORED;


-- Migration: 20260308091046_9bc2ab9e-23c0-4e59-b484-471b7f63312e.sql

-- =============================================
-- PHASE 1: 37 MASTER LOOKUP TABLES
-- (Client table already exists, so 37 new ones)
-- =============================================

-- GEOGRAPHIC TABLES
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  governorate_id uuid REFERENCES public.governorates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PHASES
CREATE TABLE public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- BOQ WORK TYPE
CREATE TABLE public.boq_work_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ITEMS CATEGORY & ITEMS
CREATE TABLE public.items_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.items_categories(id) ON DELETE SET NULL,
  unit text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CIVIL MATERIALS TYPE
CREATE TABLE public.civil_materials_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CIVIL QS / BREAKDOWN ITEMS
CREATE TABLE public.civil_qs_breakdown_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text,
  description text,
  material_type_id uuid REFERENCES public.civil_materials_types(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FINISHES
CREATE TABLE public.finishes_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.finishes_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.finishes_categories(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ELECTRICAL: CABLES, CONDUITS, ETC.
CREATE TABLE public.cable_conduits_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cables_types_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  conduit_type_id uuid REFERENCES public.cable_conduits_types(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cable_glands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  size text,
  material text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conduits_accessories_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.disconnect_switch_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.junction_box_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lighting_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transformer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.earthing_system_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MECHANICAL / PLUMBING
CREATE TABLE public.circulation_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.filter_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.filter_pump_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.heaters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.main_drains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tablet_chlorinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lambda_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  value numeric,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- WATER FEATURES
CREATE TABLE public.water_feature_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.water_feature_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.water_feature_categories(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SOIL
CREATE TABLE public.soil_sensitivity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level int,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.soil_sensitivity_types_1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  soil_type_id uuid REFERENCES public.soil_sensitivity_types(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROPOSALS
CREATE TABLE public.proposal_data_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proposal_finishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  finishes_type_id uuid REFERENCES public.finishes_types(id) ON DELETE SET NULL,
  quantity numeric DEFAULT 0,
  unit text,
  unit_rate numeric DEFAULT 0,
  total numeric DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proposal_structurals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 0,
  unit text,
  unit_rate numeric DEFAULT 0,
  total numeric DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proposal_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  status text DEFAULT 'draft',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS: Enable on ALL tables, allow read for authenticated, write for admin
-- =============================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'countries','regions','governorates','districts','phases',
      'boq_work_types','brands','items_categories','items',
      'civil_materials_types','civil_qs_breakdown_items',
      'finishes_categories','finishes_types',
      'cable_conduits_types','cables_types_accessories','cable_glands',
      'conduits_accessories_types','disconnect_switch_types',
      'junction_box_types','lighting_types','transformer_types',
      'earthing_system_components','circulation_accessories',
      'filter_types','filter_pump_types','heaters','main_drains',
      'tablet_chlorinators','lambda_factors',
      'water_feature_categories','water_feature_types',
      'soil_sensitivity_types','soil_sensitivity_types_1',
      'proposal_data_entries','proposal_finishes',
      'proposal_structurals','proposal_creations'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    
    EXECUTE format(
      'CREATE POLICY "Authenticated users can view %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)',
      tbl
    );
    
    EXECUTE format(
      'CREATE POLICY "Admins can manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))',
      tbl
    );
  END LOOP;
END;
$$;

-- updated_at triggers for all new tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'countries','regions','governorates','districts','phases',
      'boq_work_types','brands','items_categories','items',
      'civil_materials_types','civil_qs_breakdown_items',
      'finishes_categories','finishes_types',
      'cable_conduits_types','cables_types_accessories','cable_glands',
      'conduits_accessories_types','disconnect_switch_types',
      'junction_box_types','lighting_types','transformer_types',
      'earthing_system_components','circulation_accessories',
      'filter_types','filter_pump_types','heaters','main_drains',
      'tablet_chlorinators','lambda_factors',
      'water_feature_categories','water_feature_types',
      'soil_sensitivity_types','soil_sensitivity_types_1',
      'proposal_data_entries','proposal_finishes',
      'proposal_structurals','proposal_creations'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      tbl
    );
  END LOOP;
END;
$$;


-- Migration: 20260308093406_72a6f712-9559-48ef-a483-c11016787979.sql

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


-- Migration: 20260308101506_975068b7-8e7b-48e6-8631-bb6acde427f1.sql

-- Client invoices (IPC log) table
CREATE TABLE public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text,
  project_name text NOT NULL,
  project_code text NOT NULL,
  contract_value numeric DEFAULT 0,
  advanced_payment numeric DEFAULT 0,
  ipc_no text,
  cutoff_date date,
  revision integer DEFAULT 0,
  submitted_date date,
  received_date date,
  approved_date date,
  previous_gross_value numeric DEFAULT 0,
  current_gross_value numeric DEFAULT 0,
  cumulative_gross_value numeric DEFAULT 0,
  fluctuation numeric DEFAULT 0,
  contract_deduction numeric DEFAULT 0,
  other_deduction numeric DEFAULT 0,
  total_deduction numeric DEFAULT 0,
  collections numeric DEFAULT 0,
  total_net_value numeric DEFAULT 0,
  gross_acc_pct numeric DEFAULT 0,
  approval_days integer DEFAULT 25,
  expected_reply_date date,
  remaining_days numeric DEFAULT 0,
  review_status text DEFAULT 'تحت الاعتماد',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved')),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ongoing projects table
CREATE TABLE public.ongoing_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text,
  project_code text NOT NULL,
  project_name text NOT NULL,
  contract_value numeric DEFAULT 0,
  advanced_payment numeric DEFAULT 0,
  project_manager text,
  phone text,
  project_status text DEFAULT 'يعمل',
  est_sent_date date,
  delay_days numeric DEFAULT 0,
  actual_sent_date date,
  progress_statement text,
  progress_date date,
  invoice_status text,
  approval_date date,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ongoing_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_invoices
CREATE POLICY "Authenticated users can view client_invoices" ON public.client_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert client_invoices" ON public.client_invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator and admins can update client_invoices" ON public.client_invoices FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'finance'));
CREATE POLICY "Admins can delete client_invoices" ON public.client_invoices FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'finance'));

-- RLS policies for ongoing_projects
CREATE POLICY "Authenticated users can view ongoing_projects" ON public.ongoing_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ongoing_projects" ON public.ongoing_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator and admins can update ongoing_projects" ON public.ongoing_projects FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY "Admins can delete ongoing_projects" ON public.ongoing_projects FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_client_invoices_updated_at BEFORE UPDATE ON public.client_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ongoing_projects_updated_at BEFORE UPDATE ON public.ongoing_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Migration: 20260308114044_661945cd-5ec8-4672-baaa-3f4ef6819408.sql
-- Budget Module Tables

-- 1. Create budget_status enum
CREATE TYPE public.budget_status AS ENUM ('draft', 'submitted', 'approved', 'locked');

-- 2. Create qty_source enum
CREATE TYPE public.qty_source AS ENUM ('boq', 'remeasured', 'drawings', 'manual');

-- 3. Create budget_cost_type enum
CREATE TYPE public.budget_cost_type AS ENUM ('material', 'labor', 'equipment', 'subcontract');

-- 4. Create budget_headers table
CREATE TABLE public.budget_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.ongoing_projects(id) ON DELETE CASCADE NOT NULL,
    version INTEGER DEFAULT 1,
    status public.budget_status DEFAULT 'draft',
    total_direct_cost NUMERIC DEFAULT 0,
    total_indirect_cost NUMERIC DEFAULT 0,
    total_budget NUMERIC DEFAULT 0,
    contract_value NUMERIC DEFAULT 0,
    expected_profit NUMERIC DEFAULT 0,
    profit_margin_pct NUMERIC DEFAULT 0,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejection_comment TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- 5. Create budget_lines table
CREATE TABLE public.budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_header_id UUID REFERENCES public.budget_headers(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.ongoing_projects(id) ON DELETE CASCADE NOT NULL,
    discipline TEXT,
    activity TEXT,
    cost_code TEXT,
    description TEXT,
    unit TEXT,
    boq_qty NUMERIC DEFAULT 0,
    remeasured_qty NUMERIC DEFAULT 0,
    drawings_qty NUMERIC DEFAULT 0,
    qty_source public.qty_source DEFAULT 'boq',
    budget_qty NUMERIC DEFAULT 0,
    qty_source_note TEXT,
    direct_cost_total NUMERIC DEFAULT 0,
    indirect_pct NUMERIC DEFAULT 11,
    indirect_amount NUMERIC DEFAULT 0,
    line_total NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- 6. Create budget_line_costs table
CREATE TABLE public.budget_line_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_id UUID REFERENCES public.budget_lines(id) ON DELETE CASCADE NOT NULL,
    cost_type public.budget_cost_type NOT NULL,
    description TEXT,
    unit TEXT,
    qty NUMERIC DEFAULT 0,
    unit_rate NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    supplier_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- 7. Create budget_qty_sources table (source documents)
CREATE TABLE public.budget_qty_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_id UUID REFERENCES public.budget_lines(id) ON DELETE CASCADE NOT NULL,
    source_type public.qty_source NOT NULL,
    qty NUMERIC DEFAULT 0,
    document_ref TEXT,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    file_url TEXT
);

-- 8. Enable RLS
ALTER TABLE public.budget_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_qty_sources ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for budget_headers
CREATE POLICY "Authenticated users can view budget_headers"
ON public.budget_headers FOR SELECT
USING (true);

CREATE POLICY "Cost Controller and Estimator can insert budget_headers"
ON public.budget_headers FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator'))
);

CREATE POLICY "Cost Controller can update draft budget_headers"
ON public.budget_headers FOR UPDATE
USING (
    (status = 'draft' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator')))
    OR
    (status = 'submitted' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'ceo')))
);

CREATE POLICY "Admin can delete budget_headers"
ON public.budget_headers FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 10. RLS Policies for budget_lines
CREATE POLICY "Authenticated users can view budget_lines"
ON public.budget_lines FOR SELECT
USING (true);

CREATE POLICY "Authorized users can insert budget_lines"
ON public.budget_lines FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM budget_headers bh 
        WHERE bh.id = budget_header_id 
        AND bh.status = 'draft'
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator'))
    )
);

CREATE POLICY "Authorized users can update budget_lines"
ON public.budget_lines FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM budget_headers bh 
        WHERE bh.id = budget_header_id 
        AND bh.status = 'draft'
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator'))
    )
);

CREATE POLICY "Authorized users can delete budget_lines"
ON public.budget_lines FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM budget_headers bh 
        WHERE bh.id = budget_header_id 
        AND bh.status = 'draft'
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control'))
    )
);

-- 11. RLS Policies for budget_line_costs
CREATE POLICY "Authenticated users can view budget_line_costs"
ON public.budget_line_costs FOR SELECT
USING (true);

CREATE POLICY "Authorized users can manage budget_line_costs"
ON public.budget_line_costs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM budget_lines bl
        JOIN budget_headers bh ON bh.id = bl.budget_header_id
        WHERE bl.id = budget_line_id
        AND bh.status = 'draft'
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator'))
    )
);

-- 12. RLS Policies for budget_qty_sources
CREATE POLICY "Authenticated users can view budget_qty_sources"
ON public.budget_qty_sources FOR SELECT
USING (true);

CREATE POLICY "Authorized users can manage budget_qty_sources"
ON public.budget_qty_sources FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM budget_lines bl
        JOIN budget_headers bh ON bh.id = bl.budget_header_id
        WHERE bl.id = budget_line_id
        AND bh.status = 'draft'
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cost_control') OR has_role(auth.uid(), 'estimator') OR has_role(auth.uid(), 'site_engineer'))
    )
);

-- 13. Triggers for updated_at
CREATE TRIGGER update_budget_headers_updated_at
    BEFORE UPDATE ON public.budget_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_lines_updated_at
    BEFORE UPDATE ON public.budget_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_costs_updated_at
    BEFORE UPDATE ON public.budget_line_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Create cost_control_baseline view
CREATE VIEW public.cost_control_baseline AS
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

-- Migration: 20260308114055_6c6582c0-29eb-4272-a6ad-cad721b0ba86.sql
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

-- Migration: 20260308120423_5aea1d86-336e-4757-9833-208f9604b7ab.sql
-- Create ENUMs for Cost Control
CREATE TYPE public.cost_type AS ENUM ('material', 'labor', 'equipment', 'subcontract', 'overhead', 'other');
CREATE TYPE public.cost_source AS ENUM ('procurement', 'inventory', 'payroll', 'contractor_payment', 'manual');
CREATE TYPE public.commitment_status AS ENUM ('active', 'partially_paid', 'fully_paid', 'cancelled');
CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE public.alert_type AS ENUM ('cost_overrun', 'low_margin', 'cpi_critical', 'budget_90pct', 'forecast_loss');
CREATE TYPE public.eac_method AS ENUM ('cpi', 'spi', 'manual');

-- Table 1: actual_costs - سجل التكاليف الفعلية
CREATE TABLE public.actual_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  cost_type cost_type NOT NULL,
  source cost_source NOT NULL DEFAULT 'manual',
  source_ref_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  invoice_ref text,
  entered_by uuid NOT NULL,
  approved_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 2: committed_costs - التكاليف الملتزم بها
CREATE TABLE public.committed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  source text NOT NULL,
  source_ref_id uuid,
  committed_amount numeric NOT NULL DEFAULT 0,
  invoiced_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  remaining numeric GENERATED ALWAYS AS (committed_amount - paid_amount) STORED,
  status commitment_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 3: cost_forecasts - توقعات التكلفة
CREATE TABLE public.cost_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  forecast_date date NOT NULL DEFAULT CURRENT_DATE,
  bac numeric DEFAULT 0,
  ev numeric DEFAULT 0,
  ac numeric DEFAULT 0,
  cpi numeric DEFAULT 0,
  eac numeric DEFAULT 0,
  vac numeric DEFAULT 0,
  eac_method eac_method DEFAULT 'cpi',
  created_at timestamptz DEFAULT now()
);

-- Table 4: cost_alerts - التنبيهات التلقائية
CREATE TABLE public.cost_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ongoing_projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  alert_type alert_type NOT NULL,
  threshold numeric,
  current_value numeric,
  severity alert_severity NOT NULL DEFAULT 'warning',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.actual_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for actual_costs
CREATE POLICY "Authenticated users can view actual_costs" ON public.actual_costs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cost controllers can insert actual_costs" ON public.actual_costs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = entered_by AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'cost_control') OR
      has_role(auth.uid(), 'finance')
    )
  );

CREATE POLICY "Cost controllers can update actual_costs" ON public.actual_costs
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'cost_control') OR
    has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Admin can delete actual_costs" ON public.actual_costs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for committed_costs
CREATE POLICY "Authenticated users can view committed_costs" ON public.committed_costs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can manage committed_costs" ON public.committed_costs
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'cost_control') OR
    has_role(auth.uid(), 'procurement') OR
    has_role(auth.uid(), 'finance')
  );

-- RLS Policies for cost_forecasts
CREATE POLICY "Authenticated users can view cost_forecasts" ON public.cost_forecasts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized users can manage cost_forecasts" ON public.cost_forecasts
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'cost_control') OR
    has_role(auth.uid(), 'finance')
  );

-- RLS Policies for cost_alerts
CREATE POLICY "Authenticated users can view cost_alerts" ON public.cost_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage cost_alerts" ON public.cost_alerts
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'cost_control') OR
    has_role(auth.uid(), 'finance')
  );

-- Create indexes for performance
CREATE INDEX idx_actual_costs_project ON public.actual_costs(project_id);
CREATE INDEX idx_actual_costs_budget_line ON public.actual_costs(budget_line_id);
CREATE INDEX idx_committed_costs_project ON public.committed_costs(project_id);
CREATE INDEX idx_cost_forecasts_project ON public.cost_forecasts(project_id);
CREATE INDEX idx_cost_alerts_project ON public.cost_alerts(project_id);
CREATE INDEX idx_cost_alerts_unread ON public.cost_alerts(is_read) WHERE is_read = false;

-- Migration: 20260308123306_94326a93-4b04-4d45-88d9-6bd2d9f10b8a.sql

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- System/admin can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Function to notify approvers when budget is submitted
CREATE OR REPLACE FUNCTION public.notify_budget_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  approver_record RECORD;
  project_name_val text;
  project_code_val text;
BEGIN
  -- Only trigger when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Get project info
    SELECT project_name, project_code INTO project_name_val, project_code_val
    FROM public.ongoing_projects WHERE id = NEW.project_id;

    -- Notify all users with finance, ceo, or admin roles
    FOR approver_record IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN ('finance', 'ceo', 'admin')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
      VALUES (
        approver_record.user_id,
        'ميزانية جديدة بانتظار الاعتماد',
        'تم تقديم ميزانية المشروع ' || COALESCE(project_code_val, '') || ' - ' || COALESCE(project_name_val, '') || ' للاعتماد',
        'budget_approval',
        'budget_header',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_budget_submitted
  AFTER UPDATE ON public.budget_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_budget_submission();


-- Migration: 20260308123319_5bf4b30d-5f6f-4d5d-a2c0-7592138ad927.sql

-- Fix the permissive INSERT policy - restrict to system trigger usage
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Authorized insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'finance'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'cost_control'::app_role)
    OR auth.uid() = user_id
  );


-- Migration: 20260308123654_1f39f986-5711-4b1a-9f10-b6bb34c0529a.sql

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


-- Migration: 20260315130000_contract_analysis_phase1.sql
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

