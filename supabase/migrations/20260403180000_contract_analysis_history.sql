-- =============================================
-- CONTRACT ANALYSIS HISTORY
-- Stores full AI analysis results for cross-browser access
-- =============================================

CREATE TABLE IF NOT EXISTS public.contract_analysis_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name    text NOT NULL DEFAULT 'Unknown Project',
  contract_type   text,
  contract_value  text,
  currency        text DEFAULT 'EGP',
  overall_rating  text,            -- RED / AMBER / GREEN
  risk_score      integer DEFAULT 0,
  go_no_go        text,            -- GO / CONDITIONAL / NO-GO
  risk_count      integer DEFAULT 0,
  filename        text,            -- original file name
  analysis_json   jsonb NOT NULL,  -- full AnalysisResult object
  analyzed_at     timestamptz NOT NULL DEFAULT now(),
  model           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_analysis_history_user ON public.contract_analysis_history(user_id);
CREATE INDEX idx_analysis_history_date ON public.contract_analysis_history(analyzed_at DESC);

-- RLS
ALTER TABLE public.contract_analysis_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analysis history
CREATE POLICY "Users can view own analysis history"
  ON public.contract_analysis_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own analysis history
CREATE POLICY "Users can insert own analysis history"
  ON public.contract_analysis_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own analysis history
CREATE POLICY "Users can delete own analysis history"
  ON public.contract_analysis_history FOR DELETE TO authenticated
  USING (user_id = auth.uid());
