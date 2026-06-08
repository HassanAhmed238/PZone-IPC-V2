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
