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