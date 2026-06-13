-- Add currency column to invoices table for USD/EGP support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP';

-- Update existing invoices: any project whose contract_value column in the
-- Google Sheet had a $ sign will be updated during the next sync.
-- For now, default everything to EGP.
