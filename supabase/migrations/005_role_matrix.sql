-- ============================================================
-- Migration 005: Extended Role Matrix
-- Add new roles and seed module access
-- ============================================================

-- Add new roles to the app_role enum
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in Supabase Dashboard.
-- Run each line individually if you get a transaction error.
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'contract_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ipc_clerk';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'scheduler';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'board_member';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed module access matrix for new routes
INSERT INTO contract_module_access (module_path, module_label, role) VALUES
  ('/board-dashboard', 'Board Dashboard', 'chairman'),
  ('/board-dashboard', 'Board Dashboard', 'ceo'),
  ('/board-dashboard', 'Board Dashboard', 'board_member'),
  ('/contracts', 'Contracts Hub', 'contract_admin'),
  ('/contracts', 'Contracts Hub', 'ipc_clerk'),
  ('/contracts', 'Contracts Hub', 'scheduler'),
  ('/contract-admin', 'Contract Admin Workspace', 'contract_admin'),
  ('/invoices', 'IPC Log', 'ipc_clerk'),
  ('/invoices', 'IPC Log', 'finance'),
  ('/invoices', 'IPC Log', 'contract_admin'),
  ('/site-progress', 'Site Progress', 'scheduler'),
  ('/site-progress', 'Site Progress', 'site_engineer')
ON CONFLICT DO NOTHING;
