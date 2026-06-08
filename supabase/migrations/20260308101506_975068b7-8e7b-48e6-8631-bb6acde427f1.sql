
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
