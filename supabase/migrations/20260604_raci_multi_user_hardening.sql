-- ============================================================
-- RACI + Multi-user IPC hardening
-- Created: 2026-06-04
-- Purpose: make admin responsibilities explicit and tighten IPC write access before deployment.
-- ============================================================

-- 1. Persist the admin RACI matrix for reporting/audit.
CREATE TABLE IF NOT EXISTS public.raci_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process text NOT NULL UNIQUE,
  responsible_roles text[] NOT NULL DEFAULT '{}',
  accountable_roles text[] NOT NULL DEFAULT '{}',
  consulted_roles text[] NOT NULL DEFAULT '{}',
  informed_roles text[] NOT NULL DEFAULT '{}',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.raci_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raci_matrix_read" ON public.raci_matrix;
DROP POLICY IF EXISTS "raci_matrix_admin_write" ON public.raci_matrix;

CREATE POLICY "raci_matrix_read"
  ON public.raci_matrix
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "raci_matrix_admin_write"
  ON public.raci_matrix
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_raci_matrix_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_raci_matrix_updated_at ON public.raci_matrix;
CREATE TRIGGER trg_raci_matrix_updated_at
  BEFORE UPDATE ON public.raci_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_raci_matrix_updated_at();

INSERT INTO public.raci_matrix (
  process,
  responsible_roles,
  accountable_roles,
  consulted_roles,
  informed_roles
) VALUES
  ('Project setup and master data', ARRAY['project_manager'], ARRAY['admin'], ARRAY['cost_control','finance','contract_admin'], ARRAY['ceo','chairman']),
  ('IPC preparation and submission', ARRAY['ipc_clerk','contract_admin'], ARRAY['project_manager'], ARRAY['site_engineer','cost_control'], ARRAY['finance']),
  ('IPC approval and certification', ARRAY['contract_admin'], ARRAY['finance'], ARRAY['project_manager','cost_control'], ARRAY['ceo','chairman']),
  ('Collections and aging follow-up', ARRAY['finance'], ARRAY['ceo'], ARRAY['project_manager','contract_admin'], ARRAY['chairman','board_member']),
  ('VO and deduction review', ARRAY['contract_admin','cost_control'], ARRAY['project_manager'], ARRAY['finance','site_engineer'], ARRAY['ceo']),
  ('Dashboard publishing for board view', ARRAY['finance','cost_control'], ARRAY['ceo'], ARRAY['admin','project_manager'], ARRAY['chairman','board_member']),
  ('User access and role administration', ARRAY['admin'], ARRAY['admin'], ARRAY['ceo'], ARRAY['chairman'])
ON CONFLICT (process) DO UPDATE SET
  responsible_roles = EXCLUDED.responsible_roles,
  accountable_roles = EXCLUDED.accountable_roles,
  consulted_roles = EXCLUDED.consulted_roles,
  informed_roles = EXCLUDED.informed_roles,
  updated_at = now();

-- 2. Seed route access for the deployment roles used by the app sidebar and route guard.
-- contract_module_access is array-based in the current app.
INSERT INTO public.contract_module_access (module_path, module_label, allowed_roles) VALUES
  ('/projects', 'Project Setup', ARRAY['project_manager']),
  ('/ipc-management', 'IPC Management', ARRAY['finance','cost_control','contract_admin','ipc_clerk']),
  ('/invoices', 'Client Invoices', ARRAY['finance','contract_admin','ipc_clerk']),
  ('/collections', 'Collections', ARRAY['finance']),
  ('/stakeholders', 'Stakeholders', ARRAY['project_manager','contract_admin']),
  ('/procurement', 'Procurement', ARRAY['procurement']),
  ('/inventory', 'Inventory', ARRAY['inventory']),
  ('/site-progress', 'Site Progress', ARRAY['site_engineer','scheduler']),
  ('/cost-control', 'Cost Control', ARRAY['cost_control']),
  ('/contracts', 'Contracts', ARRAY['contract_admin']),
  ('/board-dashboard', 'Board Dashboard', ARRAY['board_member','ceo','chairman']),
  ('/user-management', 'User & RACI Admin', ARRAY['admin'])
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

-- 3. Tighten IPC invoice policies. Read remains broad for authenticated users;
-- writes require an operational role. This replaces the early prototype "any
-- authenticated user can write" policies.
DROP POLICY IF EXISTS "auth_insert_invoices" ON public.invoices;
DROP POLICY IF EXISTS "auth_update_invoices" ON public.invoices;
DROP POLICY IF EXISTS "auth_delete_invoices" ON public.invoices;

CREATE POLICY "role_insert_invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
    OR public.has_role(auth.uid(), 'contract_admin'::app_role)
    OR public.has_role(auth.uid(), 'ipc_clerk'::app_role)
  );

CREATE POLICY "role_update_invoices"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
    OR public.has_role(auth.uid(), 'contract_admin'::app_role)
    OR public.has_role(auth.uid(), 'ipc_clerk'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
    OR public.has_role(auth.uid(), 'contract_admin'::app_role)
    OR public.has_role(auth.uid(), 'ipc_clerk'::app_role)
  );

CREATE POLICY "role_delete_invoices"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
  );

-- 4. Tighten IPC projects if that standalone table is installed.
DO $$
BEGIN
  IF to_regclass('public.ipc_projects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "authenticated can write ipc_projects" ON public.ipc_projects;
    CREATE POLICY "role_write_ipc_projects"
      ON public.ipc_projects
      FOR ALL
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'project_manager'::app_role)
        OR public.has_role(auth.uid(), 'contract_admin'::app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'project_manager'::app_role)
        OR public.has_role(auth.uid(), 'contract_admin'::app_role)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_raci_matrix_process ON public.raci_matrix(process);
CREATE INDEX IF NOT EXISTS idx_contract_module_access_path ON public.contract_module_access(module_path);
