-- Fix budget_headers RLS policy
DROP POLICY IF EXISTS "Cost Controller and Estimator can insert budget_headers" ON public.budget_headers;
CREATE POLICY "Cost Controller and Estimator can insert budget_headers"
ON public.budget_headers FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cost_control'::app_role) OR public.has_role(auth.uid(), 'estimator'::app_role))
);
