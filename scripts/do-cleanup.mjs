import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  // First, fetch all collection_transactions to clean them up in memory and then delete duplicates
  const { data: rows, error } = await s.from('collection_transactions').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  // 1. Delete where Excel copy exists and this is not Excel
  const excelKeys = new Set(
    rows.filter(r => r.dedupe_key.startsWith('excel:') && r.status !== 'reversed')
        .map(r => `${r.project_code}::${r.collection_month}::${r.amount}`)
  );

  const toDelete1 = rows.filter(r => 
    !r.dedupe_key.startsWith('excel:') &&
    r.status !== 'reversed' &&
    excelKeys.has(`${r.project_code}::${r.collection_month}::${r.amount}`)
  );

  for (const r of toDelete1) {
    console.log(`Deleting non-Excel dupe: ${r.id} (${r.amount} for ${r.project_code})`);
    await s.from('collection_transactions').delete().eq('id', r.id);
  }

  // 2. Delete exact duplicates (same project, month, amount, date) keeping earliest created_at
  const { data: remainingRows } = await s.from('collection_transactions').select('*');
  const grouped = {};
  for (const r of remainingRows) {
    const key = `${r.project_code}::${r.collection_month}::${r.collection_date}::${r.amount}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  for (const [key, group] of Object.entries(grouped)) {
    if (group.length > 1) {
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const keepers = group.slice(0, 1);
      const deleters = group.slice(1);
      for (const d of deleters) {
        console.log(`Deleting exact dupe: ${d.id} (${key})`);
        await s.from('collection_transactions').delete().eq('id', d.id);
      }
    }
  }

  // Final summary
  const { data: finalRows } = await s.from('collection_transactions').select('collection_month, amount');
  const summary = {};
  for (const r of finalRows) {
    if (!summary[r.collection_month]) summary[r.collection_month] = { entries: 0, total: 0 };
    summary[r.collection_month].entries++;
    summary[r.collection_month].total += Number(r.amount);
  }

  const sortedMonths = Object.keys(summary).sort();
  for (const m of sortedMonths) {
    console.log(`${m}: ${summary[m].entries} entries -> ${summary[m].total.toFixed(2)}`);
  }
}

run();
