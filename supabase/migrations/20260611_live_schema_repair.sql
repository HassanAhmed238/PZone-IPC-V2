-- Live Supabase repair for IPC Control.
-- Run in Supabase SQL Editor for the deployed project that shows:
-- - 404 on public.ipc_projects
-- - 400 on public.get_board_snapshot(input_token)
-- - 400 on public.post_collection_transaction(row_id)

create table if not exists public.ipc_projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  project_name text not null,
  client text,
  sector text,
  project_manager text,
  contract_value numeric(18,2) default 0,
  start_date date,
  end_date date,
  location text,
  description text,
  variation_orders jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ipc_projects_project_code
  on public.ipc_projects(project_code);
create index if not exists idx_ipc_projects_client
  on public.ipc_projects(client);
create index if not exists idx_ipc_projects_project_manager
  on public.ipc_projects(project_manager);

alter table public.ipc_projects enable row level security;

drop policy if exists "authenticated can read ipc_projects" on public.ipc_projects;
drop policy if exists "authenticated can write ipc_projects" on public.ipc_projects;
drop policy if exists "ipc_projects_read" on public.ipc_projects;
drop policy if exists "ipc_projects_write" on public.ipc_projects;

create policy "ipc_projects_read"
on public.ipc_projects
for select
to authenticated
using (true);

create policy "ipc_projects_write"
on public.ipc_projects
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'solimane@pzoneinternational.com'
  or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  or coalesce(public.has_role(auth.uid(), 'admin'), false)
  or coalesce(public.has_role(auth.uid(), 'finance'), false)
  or coalesce(public.has_role(auth.uid(), 'cost_control'), false)
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'solimane@pzoneinternational.com'
  or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
  or coalesce(public.has_role(auth.uid(), 'admin'), false)
  or coalesce(public.has_role(auth.uid(), 'finance'), false)
  or coalesce(public.has_role(auth.uid(), 'cost_control'), false)
);

create or replace function public.update_ipc_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ipc_projects_updated_at on public.ipc_projects;
create trigger trg_ipc_projects_updated_at
before update on public.ipc_projects
for each row execute function public.update_ipc_projects_updated_at();

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
  on public.board_share_tokens(token);

alter table public.board_share_tokens enable row level security;

drop policy if exists "Authenticated users can manage share tokens" on public.board_share_tokens;
drop policy if exists "Anonymous users can read active board snapshots" on public.board_share_tokens;

create policy "Authenticated users can manage share tokens"
on public.board_share_tokens
for all
to authenticated
using (true)
with check (true);

create policy "Anonymous users can read active board snapshots"
on public.board_share_tokens
for select
to anon
using (is_active = true and (expires_at is null or expires_at > now()));

drop function if exists public.get_board_snapshot(text);
drop function if exists public.get_board_snapshot(uuid);

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
    return jsonb_build_object(
      'version', 2,
      'type', 'ipc_board_snapshot',
      'created_at', now(),
      'scope', jsonb_build_object('page', 'overview', 'includeCharts', true, 'includeTables', true),
      'invoices', '[]'::jsonb,
      'collections', '[]'::jsonb,
      'cashFlowTransactions', '[]'::jsonb,
      'forecasts', '[]'::jsonb
    );
  end if;

  return snapshot;
end;
$$;

grant execute on function public.get_board_snapshot(text) to anon, authenticated;

create table if not exists public.collection_transactions (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  project_name text,
  invoice_id uuid,
  invoice_number text,
  client text,
  collection_date date not null,
  collection_month date not null,
  amount numeric(15,2) not null default 0 check (amount > 0),
  currency text not null default 'EGP',
  reference_no text,
  bank_account text,
  notes text,
  source_type text not null default 'manual',
  source_file_name text,
  source_row_key text,
  dedupe_key text not null unique,
  status text not null default 'posted',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collection_transactions enable row level security;

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
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'solimane@pzoneinternational.com'
    or lower(coalesce(auth.jwt() ->> 'email', '')) like 'solimane@pzone%'
    or coalesce(public.has_role(auth.uid(), 'admin'), false)
    or coalesce(public.has_role(auth.uid(), 'finance'), false)
  ) then
    raise exception 'not authorized to post collections';
  end if;

  update public.collection_transactions
  set status = 'posted', updated_at = now()
  where id = row_id
    and status in ('draft', 'validated')
  returning * into updated_row;

  if updated_row.id is not null then
    return updated_row;
  end if;

  select *
    into updated_row
  from public.collection_transactions
  where id = row_id
    and status = 'posted';

  if updated_row.id is null then
    raise exception 'collection transaction not found or not postable';
  end if;

  return updated_row;
end;
$$;

grant execute on function public.post_collection_transaction(uuid) to authenticated;

notify pgrst, 'reload schema';
