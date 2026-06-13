-- Account settings and P.Zone profile approval workflow.
-- Run this before using /settings profile approvals in production.

alter table public.profiles
  add column if not exists account_status text not null default 'approved',
  add column if not exists pending_full_name text,
  add column if not exists profile_change_status text not null default 'none',
  add column if not exists profile_change_requested_at timestamptz,
  add column if not exists profile_change_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists profile_change_reviewed_at timestamptz,
  add column if not exists profile_change_rejection_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('pending', 'approved', 'suspended'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_change_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_change_status_check
      check (profile_change_status in ('none', 'pending', 'approved', 'rejected'));
  end if;
end $$;

update public.profiles
set account_status = coalesce(account_status, 'approved'),
    profile_change_status = coalesce(profile_change_status, 'none');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_profiles_change_status on public.profiles(profile_change_status);

notify pgrst, 'reload schema';
