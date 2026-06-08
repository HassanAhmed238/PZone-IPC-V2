-- IPC invoice tax column repair
-- Apply after the base invoices table exists.

alter table if exists public.invoices
  add column if not exists tax_type text default 'none',
  add column if not exists tax_direction text default 'deducted',
  add column if not exists tax_amount numeric(18,2) default 0,
  add column if not exists approved_tax_type text default 'none',
  add column if not exists approved_tax_direction text default 'added',
  add column if not exists approved_tax_amount numeric(18,2) default 0;
