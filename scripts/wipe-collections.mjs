import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient('https://dwpdrclupradpnsminvi.supabase.co', SUPABASE_KEY);

async function run() {
  console.log("Fetching all collection transactions...");
  const { data: rows, error } = await s.from('collection_transactions').select('id');
  if (error) {
    console.error("Error fetching rows:", error.message);
    return;
  }

  console.log(`Found ${rows.length} rows to delete.`);

  let deleted = 0;
  for (const r of rows) {
    const { error: delErr } = await s.from('collection_transactions').delete().eq('id', r.id);
    if (delErr) {
      console.error(`Error deleting row ${r.id}:`, delErr.message);
    } else {
      deleted++;
    }
  }

  console.log(`Successfully deleted ${deleted} rows. DB is now clean and ready for Google Sheet sync.`);
}

run();
