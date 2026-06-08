import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dwpdrclupradpnsminvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4'
);

const { data: auth } = await supabase.auth.signInWithPassword({
  email: 'admin@pzone.com',
  password: '010055',
});

// Check invoices with total_collections > 0
const { data, error } = await supabase
  .from('invoices')
  .select('project_code, client, invoice_number, total_collections, approved_net_total, status')
  .gt('total_collections', 0)
  .order('total_collections', { ascending: false });

console.log(`Invoices with collections: ${data?.length || 0}`);
if (data) {
  let totalColl = 0;
  for (const row of data) {
    console.log(`  ${row.project_code} | #${row.invoice_number || '-'} | ${row.client} | Collections: ${row.total_collections?.toLocaleString()} | Approved Net: ${row.approved_net_total?.toLocaleString()} | ${row.status}`);
    totalColl += row.total_collections || 0;
  }
  console.log(`\nTotal collections from invoices: ${totalColl.toLocaleString()}`);
}

// Check collection_transactions table
const { data: ct, error: ctErr } = await supabase
  .from('collection_transactions')
  .select('*')
  .limit(5);

console.log(`\ncollection_transactions rows: ${ct?.length || 0}${ctErr ? ` (error: ${ctErr.message})` : ''}`);

// Check total rows
const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
console.log(`Total invoice rows: ${count}`);

await supabase.auth.signOut();
