-- IPC Control Command Center hardening.
-- Run in Supabase SQL Editor before relying on online board sharing and multi-user finance dashboards.

create table if not exists public.board_share_tokens (
  token text primary key,
  snapshot_data jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  is_active boolean not null default true
);

alter table public.board_share_tokens
  add column if not exists snapshot_data jsonb not null default '[]'::jsonb,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '90 days'),
  add column if not exists is_active boolean not null default true;

create index if not exists idx_board_share_tokens_active_expiry
  on public.board_share_tokens (is_active, expires_at);

alter table public.board_share_tokens enable row level security;

drop policy if exists "Authenticated users can manage share tokens" on public.board_share_tokens;
create policy "Authenticated users can manage share tokens"
on public.board_share_tokens
for all to authenticated
using (true)
with check (true);

drop policy if exists "Anonymous users can read active board snapshots" on public.board_share_tokens;
create policy "Anonymous users can read active board snapshots"
on public.board_share_tokens
for select to anon
using (is_active = true and expires_at > now());

create or replace function public.get_board_snapshot(input_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  select snapshot_data
  into payload
  from public.board_share_tokens
  where token = input_token
    and is_active = true
    and expires_at > now();

  if payload is null then
    raise exception 'Invalid or expired share token';
  end if;

  return payload;
end;
$$;

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
begin
  new_token := gen_random_uuid()::text;
  expiry := coalesce((input_data #>> '{scope,expiresAt}')::timestamptz, now() + interval '90 days');

  insert into public.board_share_tokens (token, snapshot_data, created_by, expires_at, is_active)
  values (new_token, input_data, auth.uid(), expiry, true);

  return new_token;
end;
$$;

drop function if exists public.create_board_token(json);
create or replace function public.create_board_token(input_data json)
returns text
language sql
security definer
set search_path = public
as $$
  select public.create_board_token(input_data::jsonb);
$$;

create or replace function public.revoke_board_token(input_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.board_share_tokens
  set is_active = false
  where token = input_token;
end;
$$;

grant execute on function public.get_board_snapshot(text) to anon, authenticated;
grant execute on function public.create_board_token(jsonb) to anon, authenticated;
grant execute on function public.create_board_token(json) to anon, authenticated;
grant execute on function public.revoke_board_token(text) to authenticated;

alter table if exists public.contract_module_access enable row level security;

drop policy if exists "Authenticated can view contract_module_access" on public.contract_module_access;
drop policy if exists "Admins can manage contract_module_access" on public.contract_module_access;
drop policy if exists "contract_module_access_read" on public.contract_module_access;
drop policy if exists "contract_module_access_admin_write" on public.contract_module_access;

create policy "contract_module_access_read"
on public.contract_module_access
for select to authenticated
using (true);

create policy "contract_module_access_admin_write"
on public.contract_module_access
for all to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text in ('admin', 'chairman')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text in ('admin', 'chairman')
  )
);

insert into public.contract_module_access (module_path, module_label, allowed_roles)
values
  ('/ipc-management', 'IPC Management', array['admin','chairman','ceo','finance','cost_control','project_manager']::text[]),
  ('/invoices', 'IPC Management', array['admin','chairman','ceo','finance','cost_control','project_manager']::text[]),
  ('/collections', 'Collections', array['admin','chairman','ceo','finance','cost_control']::text[]),
  ('/cash-flow', 'Cash Flow', array['admin','chairman','ceo','finance','cost_control']::text[]),
  ('/executive', 'Executive Dashboard', array['admin','chairman','ceo','board_member','finance']::text[]),
  ('/board-dashboard', 'Board Dashboard', array['admin','chairman','ceo','board_member']::text[])
on conflict (module_path) do update
set
  module_label = excluded.module_label,
  allowed_roles = (
    select array_agg(distinct role_name order by role_name)
    from unnest(public.contract_module_access.allowed_roles || excluded.allowed_roles) as role_name
  ),
  updated_at = now();

create index if not exists idx_collection_transactions_project_month_status
  on public.collection_transactions (project_code, collection_month, status);

create index if not exists idx_cash_flow_transactions_project_month_status
  on public.cash_flow_transactions (project_code, transaction_month, status);

create index if not exists idx_cash_flow_forecasts_project_month_status
  on public.cash_flow_forecasts (project_code, forecast_month, status);

create or replace function public.ipc_system_health()
returns table (
  check_key text,
  status text,
  detail text
)
language sql
security definer
set search_path = public
as $$
  with required_tables(table_name) as (
    values
      ('invoices'),
      ('ongoing_projects'),
      ('collection_transactions'),
      ('cash_flow_transactions'),
      ('cash_flow_forecasts'),
      ('board_share_tokens'),
      ('contract_module_access'),
      ('user_roles'),
      ('profiles')
  )
  select
    table_name as check_key,
    case when exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = required_tables.table_name
    ) then 'ok' else 'error' end as status,
    case when exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = required_tables.table_name
    ) then 'table exists' else 'missing table' end as detail
  from required_tables
  union all
  select
    'get_board_snapshot_rpc',
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_board_snapshot'
    ) then 'ok' else 'error' end,
    'board share snapshot reader';
$$;

grant execute on function public.ipc_system_health() to authenticated;
