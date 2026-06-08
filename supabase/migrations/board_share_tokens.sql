-- Board Share Token Migration
-- Run this SQL in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/dwpdrclupradpnsminvi/sql/new

-- 1. Create the board_share_tokens table
CREATE TABLE IF NOT EXISTS public.board_share_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  snapshot_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days'),
  is_active boolean DEFAULT true
);
ALTER TABLE public.board_share_tokens
  ADD COLUMN IF NOT EXISTS snapshot_data jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.board_share_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage share tokens" ON public.board_share_tokens;
CREATE POLICY "Authenticated users can manage share tokens"
ON public.board_share_tokens FOR ALL TO authenticated
USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anonymous users can read active board snapshots" ON public.board_share_tokens;
CREATE POLICY "Anonymous users can read active board snapshots"
ON public.board_share_tokens FOR SELECT TO anon
USING (is_active = true AND expires_at > now());
DROP POLICY IF EXISTS "Anonymous users can create board snapshots" ON public.board_share_tokens;
CREATE POLICY "Anonymous users can create board snapshots"
ON public.board_share_tokens FOR INSERT TO anon
WITH CHECK (
  is_active = true
  AND jsonb_typeof(snapshot_data) = 'array'
  AND expires_at <= now() + interval '90 days'
);

-- 2. RPC: Get invoices by token (anon users can call this)
CREATE OR REPLACE FUNCTION public.get_board_snapshot(input_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE snapshot jsonb;
BEGIN
  SELECT snapshot_data INTO snapshot
  FROM public.board_share_tokens
  WHERE token = input_token AND is_active = true AND expires_at > now()
  LIMIT 1;

  IF snapshot IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  RETURN snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_board_invoices(input_token uuid)
RETURNS SETOF public.invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.board_share_tokens
    WHERE token = input_token AND is_active = true AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  RETURN QUERY
  WITH token_row AS (
    SELECT snapshot_data
    FROM public.board_share_tokens
    WHERE token = input_token AND is_active = true AND expires_at > now()
    LIMIT 1
  )
  SELECT *
  FROM jsonb_populate_recordset(NULL::public.invoices, (SELECT snapshot_data FROM token_row))
  ORDER BY project_code, invoice_number;
END;
$$;

-- 3. RPC: Create new token from a board snapshot
DROP FUNCTION IF EXISTS public.create_board_token(jsonb);
CREATE OR REPLACE FUNCTION public.create_board_token(input_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_token uuid;
BEGIN
  IF jsonb_typeof(input_data) <> 'array' THEN
    RAISE EXCEPTION 'input_data must be a JSON array';
  END IF;

  UPDATE public.board_share_tokens
     SET is_active = false
   WHERE is_active = true
     AND (created_by = auth.uid() OR auth.uid() IS NULL);

  INSERT INTO public.board_share_tokens (token, snapshot_data, created_by)
  VALUES (gen_random_uuid(), input_data, auth.uid())
  RETURNING token INTO new_token;

  RETURN new_token;
END;
$$;

-- Backward-compatible no-arg RPC.
DROP FUNCTION IF EXISTS public.create_board_token(json);
CREATE OR REPLACE FUNCTION public.create_board_token(input_data json)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.create_board_token(input_data::jsonb);
$$;

-- Backward-compatible no-arg RPC.
CREATE OR REPLACE FUNCTION public.create_board_token()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_token uuid;
BEGIN
  UPDATE public.board_share_tokens
     SET is_active = false
   WHERE is_active = true
     AND (created_by = auth.uid() OR auth.uid() IS NULL);

  INSERT INTO public.board_share_tokens (token, snapshot_data, created_by)
  SELECT gen_random_uuid(), coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.project_code, i.invoice_number), '[]'::jsonb), auth.uid()
  FROM public.invoices i
  RETURNING token INTO new_token;

  RETURN new_token;
END;
$$;

-- 4. RPC: Revoke token
CREATE OR REPLACE FUNCTION public.revoke_board_token(input_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.board_share_tokens
     SET is_active = false
   WHERE token = input_token
     AND (created_by = auth.uid() OR auth.uid() IS NULL);
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_board_snapshot(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_board_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_board_invoices(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_board_invoices(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_board_token(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_board_token(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_board_token(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_board_token(json) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_board_token() TO anon;
GRANT EXECUTE ON FUNCTION public.create_board_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_board_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.revoke_board_token(uuid) TO authenticated;
