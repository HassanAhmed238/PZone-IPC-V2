const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  const { data, error } = await supabaseAdmin.from('contracts').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log("Contracts Columns:", Object.keys(data[0]));
  } else {
    console.log("Contracts table is empty");
  }
}
run();
