import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  const { data: rows, error } = await s.from('collection_transactions').select('*');
  if (error) { console.error(error); return; }

  // Group by project_code and collection_month
  const groups = {};
  for (const r of rows) {
    if (r.status === 'reversed') continue;
    const key = `${r.project_code}::${r.collection_month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const toDeleteIds = [];

  for (const [key, group] of Object.entries(groups)) {
    // Sort by created_at descending (newest first). The newest one is our `sheet::` one.
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Find the newest one that is from the Google Sheet (source_type = 'import')
    // If no import exists, just keep the newest one
    let keeper = group.find(r => r.source_type === 'import') || group[0];

    // The rest are to be deleted
    for (const r of group) {
      if (r.id !== keeper.id) {
        toDeleteIds.push(r.id);
      }
    }
  }

  console.log(`Deleting ${toDeleteIds.length} duplicate/legacy rows...`);

  // Delete in batches to avoid timeout
  const batchSize = 100;
  for (let i = 0; i < toDeleteIds.length; i += batchSize) {
    const batch = toDeleteIds.slice(i, i + batchSize);
    const { error } = await s.from('collection_transactions').delete().in('id', batch);
    if (error) {
      console.error(`Error deleting batch:`, error);
    }
  }

  console.log("Cleanup complete!");

  const { data: finalRows } = await s.from('collection_transactions').select('*').neq('status', 'reversed');
  const cleanTotals = {};
  for (const r of finalRows) {
    const m = r.collection_month;
    if (!cleanTotals[m]) cleanTotals[m] = 0;
    cleanTotals[m] += Number(r.amount);
  }

  console.log("=== Final Clean Totals ===");
  for (const m of Object.keys(cleanTotals).sort()) {
    console.log(`${m}: ${cleanTotals[m].toFixed(2)}`);
  }
}
run();
