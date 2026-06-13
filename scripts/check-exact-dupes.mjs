import { createClient } from '@supabase/supabase-js';
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4');

(async () => {
  // we can't use rpc exec_sql if it's not defined, let's fetch all rows and analyze manually
  const { data, error } = await s.from('collection_transactions').select('id, dedupe_key, project_code, amount, source_type, source_file_name');
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  const counts = {};
  data.forEach(r => {
    if (!counts[r.dedupe_key]) counts[r.dedupe_key] = { count: 0, rows: [] };
    counts[r.dedupe_key].count++;
    counts[r.dedupe_key].rows.push(r);
  });
  
  let hasDupes = false;
  for (const [key, val] of Object.entries(counts)) {
    if (val.count > 1) {
      hasDupes = true;
      console.log(`DUPE KEY: ${key} (${val.count} times)`);
      val.rows.forEach(r => console.log(`  -> ID: ${r.id}, Project: ${r.project_code}, Amount: ${r.amount}, Source: ${r.source_file_name}`));
    }
  }
  if (!hasDupes) console.log("No exact dedupe_key duplicates found. Duplicates must have different dedupe_keys.");
})();
