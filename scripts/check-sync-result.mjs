import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  const { data: rows, error } = await s.from('collection_transactions').select('*').neq('status', 'reversed');
  if (error) { console.error(error); return; }

  const byMonth = {};
  for (const r of rows) {
    if (!byMonth[r.collection_month]) byMonth[r.collection_month] = { count: 0, total: 0 };
    byMonth[r.collection_month].count++;
    byMonth[r.collection_month].total += Number(r.amount);
  }

  console.log("=== DB Totals ===");
  for (const m of Object.keys(byMonth).sort()) {
    console.log(`${m}: ${byMonth[m].count} rows -> ${byMonth[m].total.toFixed(2)}`);
  }

  const { data: aprRows } = await s.from('collection_transactions').select('id, dedupe_key, project_code, amount, created_at').eq('collection_month', '2026-04-01');
  console.log("\nSample of April rows to check for duplicates:");
  
  // Find dupes in April by checking dedupe_key
  const keys = {};
  for (const r of aprRows) {
    if (!keys[r.dedupe_key]) keys[r.dedupe_key] = 0;
    keys[r.dedupe_key]++;
  }
  let dupeCount = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (v > 1) {
      console.log(`DUPE KEY: ${k} appears ${v} times`);
      dupeCount++;
    }
  }
  console.log(`Found ${dupeCount} dedupe keys that have duplicates in April.`);
}

run();
