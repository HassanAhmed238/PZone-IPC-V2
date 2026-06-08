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
