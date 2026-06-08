
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
