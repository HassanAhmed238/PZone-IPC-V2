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