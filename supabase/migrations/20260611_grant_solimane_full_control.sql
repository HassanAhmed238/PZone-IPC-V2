-- Grant full application control to solimane@pzoneinternational.com.
-- Run this in Supabase SQL Editor after the user exists in Authentication > Users.
-- This is idempotent and only inserts roles that exist in the current app_role enum.

do $$
declare
  target_email text := 'solimane@pzoneinternational.com';
  target_user_id uuid;
  role_name text;
  full_control_roles text[] := array[
    'admin',
    'chairman',
    'ceo',
    'finance',
    'project_manager',
    'cost_control',
    'estimator',
    'procurement',
    'inventory',
    'site_engineer',
    'contract_admin',
    'ipc_clerk',
    'scheduler',
    'board_member'
  ];
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'User % was not found in auth.users. Create/login the user first, then rerun this SQL.', target_email;
  end if;

  insert into public.profiles (user_id, full_name, department)
  values (target_user_id, 'Solimane', 'Administration')
  on conflict (user_id) do update
  set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    department = coalesce(public.profiles.department, excluded.department),
    updated_at = now();

  foreach role_name in array full_control_roles loop
    if exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'app_role'
        and e.enumlabel = role_name
    ) then
      execute
        'insert into public.user_roles (user_id, role)
         values ($1, $2::public.app_role)
         on conflict (user_id, role) do nothing'
      using target_user_id, role_name;
    end if;
  end loop;
end $$;

-- Make the route/module matrix explicit: admin and chairman must be accepted on every module.
update public.contract_module_access
set
  allowed_roles = (
    select array_agg(distinct role_name order by role_name)
    from unnest(coalesce(allowed_roles, '{}'::text[]) || array['admin','chairman']::text[]) as role_name
    where role_name is not null and role_name <> ''
  ),
  updated_at = now();

insert into public.contract_module_access (module_path, module_label, allowed_roles)
values
  ('/projects', 'Project Setup', array['admin','chairman','ceo','project_manager','contract_admin']::text[]),
  ('/ipc-management', 'IPC Management', array['admin','chairman','ceo','finance','cost_control','project_manager','contract_admin','ipc_clerk']::text[]),
  ('/invoices', 'IPC Register', array['admin','chairman','ceo','finance','cost_control','project_manager','contract_admin','ipc_clerk']::text[]),
  ('/collections', 'Collections', array['admin','chairman','ceo','finance','cost_control']::text[]),
  ('/cash-flow', 'Cash Flow', array['admin','chairman','ceo','finance','cost_control']::text[]),
  ('/executive', 'Executive Dashboard', array['admin','chairman','ceo','finance','board_member']::text[]),
  ('/master-data', 'Master Data', array['admin','chairman']::text[]),
  ('/user-management', 'User & RACI Admin', array['admin','chairman','ceo']::text[]),
  ('/stakeholders', 'Stakeholders', array['admin','chairman','ceo','project_manager','contract_admin']::text[]),
  ('/contracts', 'Contracts', array['admin','chairman','ceo','contract_admin','cost_control']::text[]),
  ('/board-dashboard', 'Board Dashboard', array['admin','chairman','ceo','board_member']::text[])
on conflict (module_path) do update
set
  module_label = excluded.module_label,
  allowed_roles = (
    select array_agg(distinct role_name order by role_name)
    from unnest(public.contract_module_access.allowed_roles || excluded.allowed_roles) as role_name
    where role_name is not null and role_name <> ''
  ),
  updated_at = now();

-- Verification query:
-- select u.email, array_agg(ur.role::text order by ur.role::text) as roles
-- from auth.users u
-- left join public.user_roles ur on ur.user_id = u.id
-- where lower(u.email) = lower('solimane@pzoneinternational.com')
-- group by u.email;
