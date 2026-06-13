import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  const { data: rows, error } = await s.from('collection_transactions').select('*');
  if (error) { console.error(error); return; }

  const byMonthAndSource = {};
  for (const r of rows) {
    if (r.status === 'reversed') continue;
    const isExcel = r.dedupe_key.startsWith('excel:');
    const sourceLabel = isExcel ? 'Excel' : 'GoogleSheet';
    
    if (!byMonthAndSource[r.collection_month]) byMonthAndSource[r.collection_month] = { Excel: 0, GoogleSheet: 0 };
    byMonthAndSource[r.collection_month][sourceLabel] += Number(r.amount);
  }

  console.log("=== DB Totals by Source ===");
  for (const m of Object.keys(byMonthAndSource).sort()) {
    console.log(`${m}: Excel = ${byMonthAndSource[m].Excel.toFixed(2)}, Sheet = ${byMonthAndSource[m].GoogleSheet.toFixed(2)}, TOTAL = ${(byMonthAndSource[m].Excel + byMonthAndSource[m].GoogleSheet).toFixed(2)}`);
  }

  // Find overlaps where BOTH Excel and Sheet exist for the same project/month
  const projectMonthHasExcel = new Set(rows.filter(r => r.dedupe_key.startsWith('excel:') && r.status !== 'reversed').map(r => `${r.project_code}::${r.collection_month}`));
  
  const badSheetRows = rows.filter(r => !r.dedupe_key.startsWith('excel:') && r.status !== 'reversed' && projectMonthHasExcel.has(`${r.project_code}::${r.collection_month}`));
  
  console.log(`\nFound ${badSheetRows.length} Google Sheet rows that overlap with Excel data and should be deleted.`);
  let badSum = 0;
  for (const r of badSheetRows) {
    badSum += Number(r.amount);
    // await s.from('collection_transactions').delete().eq('id', r.id); // DO NOT UNCOMMENT YET
  }
  console.log(`Deleting these will reduce total by: ${badSum.toFixed(2)}`);
}
run();
