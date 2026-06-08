-- IPC Control Command Center — Phase 1 hardening patch.
-- Adds scope column to board_share_tokens and enhances create_board_token RPC.
-- Run AFTER 20260608_ipc_control_command_center.sql

-- 1. Add scope column for query/filter support
alter table public.board_share_tokens
  add column if not exists scope jsonb not null default '{}'::jsonb;

create index if not exists idx_board_share_tokens_scope
  on public.board_share_tokens using gin (scope);

-- 2. Update create_board_token to store scope separately from snapshot_data
drop function if exists public.create_board_token(jsonb);
create or replace function public.create_board_token(input_data jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
  expiry timestamptz;
  token_scope jsonb;
begin
  new_token := gen_random_uuid()::text;
  token_scope := coalesce(input_data -> 'scope', '{}'::jsonb);
  expiry := coalesce(
    (token_scope ->> 'expiresAt')::timestamptz,
    (input_data #>> '{scope,expiresAt}')::timestamptz,
    now() + interval '90 days'
  );

  insert into public.board_share_tokens (token, snapshot_data, scope, created_by, expires_at, is_active)
  values (new_token, input_data, token_scope, auth.uid(), expiry, true);

  return new_token;
end;
$$;

-- Keep json overload
drop function if exists public.create_board_token(json);
create or replace function public.create_board_token(input_data json)
returns text
language sql
security definer
set search_path = public
as $$
  select public.create_board_token(input_data::jsonb);
$$;

-- 3. Grant execution
grant execute on function public.create_board_token(jsonb) to anon, authenticated;
grant execute on function public.create_board_token(json) to anon, authenticated;

-- 4. Add missing grants for ledger RPCs from 20260605
grant execute on function public.post_collection_transaction(uuid) to authenticated;
grant execute on function public.reverse_collection_transaction(uuid, text) to authenticated;
grant execute on function public.post_cash_flow_transaction(uuid) to authenticated;
grant execute on function public.reverse_cash_flow_transaction(uuid, text) to authenticated;
