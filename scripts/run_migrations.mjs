/**
 * Run pending migrations on Supabase via the Management API.
 * Order: financial_ledgers → command_center → tax_columns → phase1_hardening → snapshot_repair
 */
import { readFileSync } from 'fs';

const PROJECT_ID = 'dwpdrclupradpnsminvi';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4';

// Migration files in dependency order
const MIGRATIONS = [
  { name: '20260605_financial_ledgers.sql', path: 'd:/Hassan/ERP/PZone IPC V2/supabase/migrations/20260605_financial_ledgers.sql' },
  { name: '20260608_ipc_control_command_center.sql', path: 'd:/Hassan/ERP/PZone IPC V2/supabase/migrations/20260608_ipc_control_command_center.sql' },
  { name: '20260609_ipc_invoice_tax_columns.sql', path: 'd:/Hassan/ERP/PZone IPC V2/supabase/migrations/20260609_ipc_invoice_tax_columns.sql' },
  { name: '20260609_ipc_phase1_hardening.sql', path: 'd:/Hassan/ERP/PZone IPC V2/supabase/migrations/20260609_ipc_phase1_hardening.sql' },
  { name: '20260610_board_share_snapshot_repair.sql', path: 'd:/Hassan/ERP/PZone IPC V2/supabase/migrations/20260610_board_share_snapshot_repair.sql' },
];

// Combine all into one SQL file for manual use
let combined = `-- ============================================\n-- COMBINED MIGRATION — Run in Supabase SQL Editor\n-- Generated: ${new Date().toISOString()}\n-- ============================================\n\n`;

for (const m of MIGRATIONS) {
  const sql = readFileSync(m.path, 'utf-8');
  combined += `-- ──────────────────────────────────────────\n-- Migration: ${m.name}\n-- ──────────────────────────────────────────\n\n${sql}\n\n`;
}

// Save combined SQL
const outPath = 'd:/Hassan/ERP/PZone IPC V2/scripts/combined_migrations.sql';
import { writeFileSync } from 'fs';
writeFileSync(outPath, combined, 'utf-8');
console.log(`Combined SQL saved to: ${outPath}\n`);

// Now try to run via Supabase REST SQL endpoint
// The Supabase platform doesn't expose raw SQL via the JS client,
// but we can use the postgrest-based approach with an RPC.

// Alternative: Use supabase-js to sign in and call management API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Sign in
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@pzone.com',
  password: '010055',
});

if (authError) {
  console.error('Auth failed:', authError.message);
  console.log('\n⚠️  Copy the combined SQL from the file above and paste it in Supabase SQL Editor.');
  process.exit(1);
}

console.log(`Authenticated as ${authData.user.email}`);
const token = authData.session.access_token;

// Try running SQL via the Supabase SQL API (v1/query endpoint, requires service role or dashboard)
// Since we only have anon key, we'll try the pg_net or direct approach
// Actually — Supabase Management API uses a different auth (personal access token).
// The JS client can't run raw SQL. We need to output the SQL for the user.

console.log('\n📋 The Supabase JS client cannot run raw DDL migrations.');
console.log('The combined SQL has been saved. You have two options:\n');
console.log('Option 1: Open Supabase Dashboard → SQL Editor → Paste the contents of:');
console.log(`          ${outPath}\n`);
console.log('Option 2: Use the Supabase CLI:');
console.log('          npx supabase db push --linked\n');

// But let's try the experimental approach: use fetch to hit the SQL endpoint
console.log('Attempting to run via Supabase SQL API...\n');

for (const m of MIGRATIONS) {
  const sql = readFileSync(m.path, 'utf-8');
  console.log(`▶ Running ${m.name}...`);
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (res.ok) {
      console.log(`  ✅ ${m.name} applied successfully`);
    } else {
      const text = await res.text();
      if (text.includes('Could not find the function')) {
        console.log(`  ⚠️  exec_sql RPC not available — will need manual SQL execution`);
        break;
      }
      console.log(`  ❌ ${m.name}: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.log(`  ⚠️  Network error — will need manual SQL execution`);
    break;
  }
}

console.log('\n📄 Combined SQL file ready at:');
console.log(`   ${outPath}`);

await supabase.auth.signOut();
