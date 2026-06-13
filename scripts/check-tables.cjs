/**
 * Check if the collection_transactions table exists and has data in Supabase.
 * Uses CommonJS to run from project directory.
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dwpdrclupradpnsminvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4'
);

async function main() {
  console.log("=== CHECKING SUPABASE TABLES ===\n");

  // Check invoices table
  const { error: invErr, count: invCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });
  
  if (invErr) {
    console.log(`❌ invoices: ${invErr.message} (code: ${invErr.code})`);
  } else {
    console.log(`✅ invoices table — ${invCount} rows`);
  }

  // Check collection_transactions table
  const { error: collErr, count: collCount } = await supabase
    .from("collection_transactions")
    .select("id", { count: "exact", head: true });
  
  if (collErr) {
    console.log(`❌ collection_transactions: ${collErr.message} (code: ${collErr.code})`);
  } else {
    console.log(`✅ collection_transactions — ${collCount} rows`);
    
    // Check per-month breakdown
    for (const m of ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"]) {
      const { count } = await supabase
        .from("collection_transactions")
        .select("id", { count: "exact", head: true })
        .eq("collection_month", m);
      console.log(`   ${m}: ${count} collections`);
    }
  }

  // Check cash_flow_transactions
  const { error: cfErr, count: cfCount } = await supabase
    .from("cash_flow_transactions")
    .select("id", { count: "exact", head: true });
  
  if (cfErr) {
    console.log(`❌ cash_flow_transactions: ${cfErr.message} (code: ${cfErr.code})`);
  } else {
    console.log(`✅ cash_flow_transactions — ${cfCount} rows`);
  }

  // Check ipc_projects
  const { error: ipcErr, count: ipcCount } = await supabase
    .from("ipc_projects")
    .select("id", { count: "exact", head: true });
  
  if (ipcErr) {
    console.log(`❌ ipc_projects: ${ipcErr.message} (code: ${ipcErr.code})`);
  } else {
    console.log(`✅ ipc_projects — ${ipcCount} rows`);
  }
}

main().catch(console.error);
