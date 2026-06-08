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
