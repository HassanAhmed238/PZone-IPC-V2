import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  const { data: rows, error } = await s.from('collection_transactions').select('*').neq('status', 'reversed');
  if (error) { console.error(error); return; }

  // Group by project_code and collection_month
  const groups = {};
  for (const r of rows) {
    // Only keep Google Sheet entries to see what the sheet totals are
    if (r.dedupe_key.startsWith('excel:')) continue;

    const key = `${r.project_code}::${r.collection_month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const cleanTotals = {};
  let totalDeletedValue = 0;
  const toDeleteIds = [];

  for (const [key, group] of Object.entries(groups)) {
    // Sort by created_at descending (newest first)
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // The latest one is the keeper
    const keeper = group[0];
    const month = keeper.collection_month;
    
    if (!cleanTotals[month]) cleanTotals[month] = 0;
    cleanTotals[month] += Number(keeper.amount);

    // The rest are to be deleted
    for (let i = 1; i < group.length; i++) {
      toDeleteIds.push(group[i].id);
      totalDeletedValue += Number(group[i].amount);
    }
  }

  console.log("=== Clean Sheet Totals (keeping latest 1 per project/month) ===");
  for (const m of Object.keys(cleanTotals).sort()) {
    console.log(`${m}: ${cleanTotals[m].toFixed(2)}`);
  }
}
run();
