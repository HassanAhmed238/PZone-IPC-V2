-- Repair board sharing schema for IPC public dashboard snapshots.
-- Run this in Supabase SQL Editor for project dwpdrclupradpnsminvi.

create table if not exists public.board_share_tokens (
  id uuid default gen_random_uuid() primary key,
  token uuid default gen_random_uuid() unique not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days'),
  is_active boolean default true
);

alter table public.board_share_tokens
  add column if not exists snapshot_data jsonb not null default '[]'::jsonb;

alter table public.board_share_tokens enable row level security;

drop policy if exists "Authenticated users can manage share tokens" on public.board_share_tokens;
create policy "Authenticated users can manage share tokens"
on public.board_share_tokens for all to authenticated
using (true) with check (true);

drop policy if exists "Anonymous users can read active board snapshots" on public.board_share_tokens;
create policy "Anonymous users can read active board snapshots"
on public.board_share_tokens for select to anon
using (is_active = true and expires_at > now());

-- Needed for local dev bypass, where the app is not signed into Supabase Auth.
drop policy if exists "Anonymous users can create board snapshots" on public.board_share_tokens;
create policy "Anonymous users can create board snapshots"
on public.board_share_tokens for insert to anon
with check (
  is_active = true
  and jsonb_typeof(snapshot_data) = 'array'
  and expires_at <= now() + interval '90 days'
);

create or replace function public.get_board_snapshot(input_token uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare snapshot jsonb;
begin
  select snapshot_data into snapshot
  from public.board_share_tokens
  where token = input_token and is_active = true and expires_at > now()
  limit 1;

  if snapshot is null then
    raise exception 'Invalid or expired share token';
  end if;

  return snapshot;
end;
$$;

drop function if exists public.create_board_token(jsonb);
create or replace function public.create_board_token(input_data jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_token uuid;
begin
  if jsonb_typeof(input_data) <> 'array' then
    raise exception 'input_data must be a JSON array';
  end if;

  update public.board_share_tokens
     set is_active = false
   where is_active = true
     and (created_by = auth.uid() or auth.uid() is null);

  insert into public.board_share_tokens (token, snapshot_data, created_by)
  values (gen_random_uuid(), input_data, auth.uid())
  returning token into new_token;

  return new_token;
end;
$$;

drop function if exists public.create_board_token(json);
create or replace function public.create_board_token(input_data json)
returns uuid language sql security definer set search_path = public
as $$
  select public.create_board_token(input_data::jsonb);
$$;

create or replace function public.revoke_board_token(input_token uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.board_share_tokens
     set is_active = false
   where token = input_token
     and (created_by = auth.uid() or auth.uid() is null);
end;
$$;

grant execute on function public.get_board_snapshot(uuid) to anon, authenticated;
grant execute on function public.create_board_token(jsonb) to anon, authenticated;
grant execute on function public.create_board_token(json) to anon, authenticated;
grant execute on function public.revoke_board_token(uuid) to anon, authenticated;

select 'board sharing repair complete' as status;
