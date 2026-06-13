// Apply the currency migration using Supabase DB URL
// Supabase DB connection: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dwpdrclupradpnsminvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';

const s = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Check if column already exists
  const { data, error } = await s.from('invoices').select('currency').limit(1);
  if (!error) {
    console.log('Currency column already exists! Value:', data[0]?.currency);
    return;
  }

  // The column doesn't exist. The REST API can't do DDL.
  // But we can use a workaround: create a plpgsql function via Supabase Edge Functions
  // Or, simpler: just make the sync code resilient and skip the currency field if it doesn't exist
  
  // Alternative: Use the Management API v1
  // https://api.supabase.com/v1/projects/{ref}/database/query
  // This requires a personal access token from supabase.com/dashboard/account/tokens
  
  console.log('The currency column needs to be added to the invoices table.');
  console.log('');
  console.log('OPTION 1 - Supabase SQL Editor (recommended):');
  console.log('  Go to: https://supabase.com/dashboard/project/dwpdrclupradpnsminvi/sql/new');
  console.log('  Paste and run:');
  console.log("  ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP';");
  console.log('');
  console.log('OPTION 2 - Supabase CLI:');
  console.log('  npx supabase login');
  console.log('  npx supabase link --project-ref dwpdrclupradpnsminvi');
  console.log("  npx supabase db query --linked \"ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP';\"");
  console.log('');
  console.log('After running either option, restart the dev server and sync.');
}

main().catch(console.error);
