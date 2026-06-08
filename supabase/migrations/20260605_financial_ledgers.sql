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
