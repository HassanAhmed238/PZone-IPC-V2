
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
