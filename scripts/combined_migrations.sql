-- ============================================
-- COMBINED MIGRATION — Run in Supabase SQL Editor
-- Generated: 2026-06-08T10:46:59.095Z
-- ============================================

-- ──────────────────────────────────────────
-- Migration: 20260605_financial_ledgers.sql
-- ──────────────────────────────────────────

-- Financial ledgers for IPC actual collections, cash flow, and forecasts.
-- Run this in Supabase SQL Editor before relying on multi-user dashboard values.

create table if not exists public.collection_transactions (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  project_name text,
  invoice_id uuid null,
  invoice_number text,
  client text,
  collection_date date not null,
  collection_month date not null,
  amount numeric(15,2) not null default 0 check (amount > 0),
  currency text not null default 'EGP',
  reference_no text,
  bank_account text,
  notes text,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'import', 'legacy_backfill', 'adjustment', 'reversal')),
  source_file_name text,
  source_row_key text,
  dedupe_key text not null unique,
  status text not null default 'posted'
    check (status in ('draft', 'validated', 'posted', 'reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collection_transactions_project_code
  on public.collection_transactions(project_code);
create index if not exists idx_collection_transactions_month
  on public.collection_transactions(collection_month);
create index if not exists idx_collection_transactions_status
  on public.collection_transactions(status);
create index if not exists idx_collection_transactions_invoice_id
  on public.collection_transactions(invoice_id);

create table if not exists public.cash_flow_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  transaction_month date not null,
  project_code text,
  project_name text,
  type text not null check (type in ('in', 'out')),
  category text not null default 'other'
    check (category in ('client_collection', 'subcontractor', 'payroll', 'material', 'equipment', 'overhead', 'tax', 'other')),
  amount numeric(15,2) not null default 0 check (amount > 0),
  currency text not null default 'EGP',
  description text,
  reference_no text,
  counterparty text,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'collection_sync', 'import', 'adjustment', 'reversal')),
  source_id uuid,
  status text not null default 'posted'
    check (status in ('draft', 'validated', 'posted', 'reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cash_flow_transactions_project_code
  on public.cash_flow_transactions(project_code);
create index if not exists idx_cash_flow_transactions_month
  on public.cash_flow_transactions(transaction_month);
create index if not exists idx_cash_flow_transactions_type
  on public.cash_flow_transactions(type);
create index if not exists idx_cash_flow_transactions_status
  on public.cash_flow_transactions(status);

create table if not exists public.cash_flow_forecasts (
  id uuid primary key default gen_random_uuid(),
  forecast_date date not null,
  forecast_month date not null,
  project_code text,
  project_name text,
  type text not null check (type in ('in', 'out')),
  category text not null default 'other'
    check (category in ('expected_collection', 'subcontractor', 'payroll', 'material', 'equipment', 'overhead', 'tax', 'other')),
  amount numeric(15,2) not null default 0 check (amount > 0),
  currency text not null default 'EGP',
  probability_pct numeric(5,2) not null default 100 check (probability_pct >= 0 and probability_pct <= 100),
  description text,
  reference_no text,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'ipc_expected', 'import', 'adjustment')),
  source_id uuid,
  status text not null default 'active'
    check (status in ('draft', 'active', 'closed', 'cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cash_flow_forecasts_project_code
  on public.cash_flow_forecasts(project_code);
create index if not exists idx_cash_flow_forecasts_month
  on public.cash_flow_forecasts(forecast_month);
create index if not exists idx_cash_flow_forecasts_type
  on public.cash_flow_forecasts(type);
create index if not exists idx_cash_flow_forecasts_status
  on public.cash_flow_forecasts(status);

alter table public.collection_transactions enable row level security;
alter table public.cash_flow_transactions enable row level security;
alter table public.cash_flow_forecasts enable row level security;

drop policy if exists "financial_collection_read" on public.collection_transactions;
drop policy if exists "financial_collection_write" on public.collection_transactions;
drop policy if exists "financial_cashflow_read" on public.cash_flow_transactions;
drop policy if exists "financial_cashflow_write" on public.cash_flow_transactions;
drop policy if exists "financial_forecast_read" on public.cash_flow_forecasts;
drop policy if exists "financial_forecast_write" on public.cash_flow_forecasts;

create policy "financial_collection_read"
  on public.collection_transactions for select to authenticated using (true);
create policy "financial_collection_write"
  on public.collection_transactions for all to authenticated
  using (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  )
  with check (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  );

create policy "financial_cashflow_read"
  on public.cash_flow_transactions for select to authenticated using (true);
create policy "financial_cashflow_write"
  on public.cash_flow_transactions for all to authenticated
  using (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  )
  with check (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  );

create policy "financial_forecast_read"
  on public.cash_flow_forecasts for select to authenticated using (true);
create policy "financial_forecast_write"
  on public.cash_flow_forecasts for all to authenticated
  using (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  )
  with check (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  );

create or replace function public.post_collection_transaction(row_id uuid)
returns public.collection_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.collection_transactions;
begin
  if not (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  ) then
    raise exception 'not authorized to post collections';
  end if;

  update public.collection_transactions
  set status = 'posted', updated_at = now()
  where id = row_id
    and status in ('draft', 'validated')
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'collection transaction not found or not postable';
  end if;

  return updated_row;
end;
$$;

create or replace function public.reverse_collection_transaction(row_id uuid, reversal_note text default null)
returns public.collection_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.collection_transactions;
begin
  if not (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  ) then
    raise exception 'not authorized to reverse collections';
  end if;

  update public.collection_transactions
  set
    status = 'reversed',
    notes = trim(coalesce(notes, '') || case when reversal_note is null or reversal_note = '' then '' else E'\nReversal: ' || reversal_note end),
    updated_at = now()
  where id = row_id
    and status in ('validated', 'posted')
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'collection transaction not found or not reversible';
  end if;

  return updated_row;
end;
$$;

create or replace function public.post_cash_flow_transaction(row_id uuid)
returns public.cash_flow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.cash_flow_transactions;
begin
  if not (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  ) then
    raise exception 'not authorized to post cash flow';
  end if;

  update public.cash_flow_transactions
  set status = 'posted', updated_at = now()
  where id = row_id
    and status in ('draft', 'validated')
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'cash flow transaction not found or not postable';
  end if;

  return updated_row;
end;
$$;

create or replace function public.reverse_cash_flow_transaction(row_id uuid, reversal_note text default null)
returns public.cash_flow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.cash_flow_transactions;
begin
  if not (
    has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'finance')
    or has_role(auth.uid(), 'cost_control')
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  ) then
    raise exception 'not authorized to reverse cash flow';
  end if;

  update public.cash_flow_transactions
  set
    status = 'reversed',
    description = trim(coalesce(description, '') || case when reversal_note is null or reversal_note = '' then '' else E'\nReversal: ' || reversal_note end),
    updated_at = now()
  where id = row_id
    and status in ('validated', 'posted')
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'cash flow transaction not found or not reversible';
  end if;

  return updated_row;
end;
$$;


-- ──────────────────────────────────────────
-- Migration: 20260608_ipc_control_command_center.sql
-- ──────────────────────────────────────────

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


-- ──────────────────────────────────────────
-- Migration: 20260609_ipc_invoice_tax_columns.sql
-- ──────────────────────────────────────────

-- IPC invoice tax column repair
-- Apply after the base invoices table exists.

alter table if exists public.invoices
  add column if not exists tax_type text default 'none',
  add column if not exists tax_direction text default 'deducted',
  add column if not exists tax_amount numeric(18,2) default 0,
  add column if not exists approved_tax_type text default 'none',
  add column if not exists approved_tax_direction text default 'added',
  add column if not exists approved_tax_amount numeric(18,2) default 0;


-- ──────────────────────────────────────────
-- Migration: 20260609_ipc_phase1_hardening.sql
-- ──────────────────────────────────────────

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


-- ──────────────────────────────────────────
-- Migration: 20260610_board_share_snapshot_repair.sql
-- ──────────────────────────────────────────

-- Board sharing snapshot repair for IPC Command Center.
-- Use this when share generation fails with:
--   column board_share_tokens.snapshot_data does not exist
--   could not find function public.create_board_token(input_data)
--   could not find function public.get_board_snapshot(input_token)

drop function if exists public.get_board_snapshot(text);
drop function if exists public.get_board_snapshot(uuid);
drop function if exists public.get_board_invoices(text);
drop function if exists public.get_board_invoices(uuid);
drop function if exists public.create_board_token(jsonb);
drop function if exists public.create_board_token(json);
drop function if exists public.create_board_token();
drop function if exists public.revoke_board_token(text);
drop function if exists public.revoke_board_token(uuid);

create table if not exists public.board_share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default gen_random_uuid()::text,
  snapshot_data jsonb not null default '{}'::jsonb,
  scope jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '90 days'),
  is_active boolean not null default true
);

alter table public.board_share_tokens
  add column if not exists token text,
  add column if not exists snapshot_data jsonb not null default '{}'::jsonb,
  add column if not exists scope jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz default (now() + interval '90 days'),
  add column if not exists is_active boolean not null default true;

alter table public.board_share_tokens
  alter column token type text using token::text,
  alter column token set default gen_random_uuid()::text,
  alter column snapshot_data set default '{}'::jsonb,
  alter column scope set default '{}'::jsonb,
  alter column is_active set default true;

update public.board_share_tokens
set token = gen_random_uuid()::text
where token is null or token = '';

alter table public.board_share_tokens
  alter column token set not null,
  alter column snapshot_data set not null,
  alter column scope set not null,
  alter column created_at set not null,
  alter column is_active set not null;

create unique index if not exists idx_board_share_tokens_token
  on public.board_share_tokens (token);

create index if not exists idx_board_share_tokens_active_expiry
  on public.board_share_tokens (is_active, expires_at);

create index if not exists idx_board_share_tokens_scope
  on public.board_share_tokens using gin (scope);

alter table public.board_share_tokens enable row level security;

drop policy if exists "Authenticated users can manage share tokens" on public.board_share_tokens;
create policy "Authenticated users can manage share tokens"
on public.board_share_tokens
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anonymous users can read active board snapshots" on public.board_share_tokens;
create policy "Anonymous users can read active board snapshots"
on public.board_share_tokens
for select
to anon
using (is_active = true and (expires_at is null or expires_at > now()));

create or replace function public.get_board_snapshot(input_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot jsonb;
begin
  select snapshot_data
    into snapshot
  from public.board_share_tokens
  where token = input_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if snapshot is null then
    raise exception 'Invalid or expired share token';
  end if;

  return snapshot;
end;
$$;

create or replace function public.create_board_token(input_data jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
  token_scope jsonb;
  token_expires_at timestamptz;
begin
  if jsonb_typeof(input_data) <> 'object' then
    raise exception 'input_data must be a JSON object board snapshot';
  end if;

  token_scope := coalesce(input_data -> 'scope', '{}'::jsonb);
  token_expires_at := nullif(input_data #>> '{scope,expiresAt}', '')::timestamptz;

  insert into public.board_share_tokens (snapshot_data, scope, created_by, expires_at, is_active)
  values (
    input_data,
    token_scope,
    auth.uid(),
    coalesce(token_expires_at, now() + interval '90 days'),
    true
  )
  returning token into new_token;

  return new_token;
end;
$$;

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
   where token = input_token
     and (created_by = auth.uid() or auth.uid() is null);
end;
$$;

grant execute on function public.get_board_snapshot(text) to anon, authenticated;
grant execute on function public.create_board_token(jsonb) to anon, authenticated;
grant execute on function public.create_board_token(json) to anon, authenticated;
grant execute on function public.revoke_board_token(text) to anon, authenticated;


