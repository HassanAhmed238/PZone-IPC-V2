-- Fix RLS for Role-Module Matrix writes.
-- The UI writes contract_module_access.allowed_roles as an array per module.

ALTER TABLE public.contract_module_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_module_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'chairman'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) LIKE 'solimane@pzone%';
$$;

DROP POLICY IF EXISTS "Authenticated can view contract_module_access" ON public.contract_module_access;
DROP POLICY IF EXISTS "Admins can manage contract_module_access" ON public.contract_module_access;
DROP POLICY IF EXISTS "contract_module_access_read" ON public.contract_module_access;
DROP POLICY IF EXISTS "contract_module_access_admin_write" ON public.contract_module_access;

CREATE POLICY "contract_module_access_read"
  ON public.contract_module_access
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contract_module_access_admin_write"
  ON public.contract_module_access
  FOR ALL
  TO authenticated
  USING (public.can_manage_module_access())
  WITH CHECK (public.can_manage_module_access());

-- Make sure every module row exists in the current array-based format.
INSERT INTO public.contract_module_access (module_path, module_label, allowed_roles)
VALUES
  ('/tenders', 'Tender & Estimation', ARRAY['chairman','ceo','estimator']),
  ('/budget', 'Budget', ARRAY['chairman','ceo','finance','cost_control']),
  ('/projects', 'Project Setup', ARRAY['chairman','ceo','project_manager']),
  ('/ipc-management', 'IPC Management', ARRAY['chairman','ceo','finance','project_manager','cost_control','ipc_clerk','contract_admin']),
  ('/invoices', 'Client Invoices', ARRAY['chairman','ceo','finance','project_manager','cost_control','ipc_clerk','contract_admin']),
  ('/collections', 'Collections', ARRAY['chairman','ceo','finance']),
  ('/stakeholders', 'Stakeholders', ARRAY['chairman','ceo','project_manager','contract_admin']),
  ('/payments', 'Contractor Payments', ARRAY['chairman','ceo','finance']),
  ('/cash-flow', 'Cash Flow', ARRAY['chairman','ceo','finance']),
  ('/executive', 'Executive Dashboard', ARRAY['chairman','ceo','finance']),
  ('/procurement', 'Procurement', ARRAY['chairman','ceo','procurement','project_manager']),
  ('/inventory', 'Inventory', ARRAY['chairman','ceo','inventory','procurement']),
  ('/site-progress', 'Site Progress', ARRAY['chairman','ceo','project_manager','site_engineer','scheduler']),
  ('/cost-control', 'Cost Control', ARRAY['chairman','ceo','finance','cost_control']),
  ('/contracts', 'Contracts', ARRAY['chairman','ceo','contract_admin','cost_control']),
  ('/board-dashboard', 'Board Dashboard', ARRAY['chairman','ceo','board_member']),
  ('/user-management', 'User Management', ARRAY['chairman','ceo'])
ON CONFLICT (module_path) DO UPDATE SET
  module_label = EXCLUDED.module_label,
  allowed_roles = (
    SELECT ARRAY(
      SELECT DISTINCT role_name
      FROM unnest(public.contract_module_access.allowed_roles || EXCLUDED.allowed_roles) AS role_name
      WHERE role_name IS NOT NULL AND role_name <> ''
      ORDER BY role_name
    )
  ),
  updated_at = now();
