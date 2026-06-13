import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  const { data: rows } = await s.from('collection_transactions').select('*').neq('status', 'reversed');
  
  const groups = {};
  for (const r of rows) {
    if (r.dedupe_key.startsWith('excel:')) continue;
    if (r.collection_month !== '2026-04-01') continue;

    const key = r.project_code;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  console.log("=== April Google Sheet Projects ===");
  let total = 0;
  for (const [p, group] of Object.entries(groups)) {
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const keeper = group[0];
    total += Number(keeper.amount);
    
    // Group all amounts to see if there were multiple
    const amounts = group.map(g => Number(g.amount).toFixed(2));
    console.log(`${p}: keeping ${keeper.amount} (all amounts: ${amounts.join(', ')})`);
  }
  
  console.log(`\nApril Total: ${total.toFixed(2)}`);
}
run();
