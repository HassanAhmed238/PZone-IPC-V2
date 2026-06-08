/**
 * Fix Supabase schema constraints:
 * 1. Drop invoices_status_check constraint to allow Arabic statuses
 * 2. Alter numeric columns to support larger values
 * Then re-sync all months.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dwpdrclupradpnsminvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email: 'admin@pzone.com', password: '010055' });
if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
console.log('✅ Authenticated');

// Check current constraint and column info
const { data: cols } = await supabase.from('invoices').select('*').limit(0);
console.log('\nChecking what statuses exist...');

// Try to find what status values are allowed
const { data: statuses } = await supabase.from('invoices').select('status').limit(100);
const uniqueStatuses = [...new Set((statuses || []).map(r => r.status).filter(Boolean))];
console.log('Current statuses in DB:', uniqueStatuses);

// We need to run SQL via the Supabase dashboard (or use the management API).
// Let's generate the SQL for the user to run.
console.log('\n\n════════════════════════════════════════');
console.log('SQL TO RUN IN SUPABASE SQL EDITOR:');
console.log('════════════════════════════════════════\n');

const sql = `
-- Fix 1: Drop status check constraint to allow Arabic statuses
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS status_check;

-- Also try to find and drop any constraint on status
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT con.conname 
    FROM pg_constraint con 
    JOIN pg_class rel ON rel.oid = con.conrelid 
    WHERE rel.relname = 'invoices' 
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%'
  )
  LOOP
    EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END;
$$;

-- Fix 2: Change numeric(15,2) to numeric(20,2) for larger values  
ALTER TABLE invoices ALTER COLUMN contract_value TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN work_previous TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN work_current TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN work_total TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN total_deductions TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN net_previous TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN net_current TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN net_total TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_previous TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_current TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_total TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_deductions TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_net_previous TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_net_current TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN approved_net_total TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN total_collections TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN expected_collection TYPE numeric(20,2);
ALTER TABLE invoices ALTER COLUMN contract_percentage TYPE numeric(10,2);

-- Verify
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND data_type = 'numeric'
ORDER BY column_name;
`;

console.log(sql);
console.log('\n════════════════════════════════════════');
console.log('Run the above SQL in your Supabase SQL Editor');
console.log('Then run: node scripts/sync_all_months.mjs');
console.log('════════════════════════════════════════\n');

await supabase.auth.signOut();
