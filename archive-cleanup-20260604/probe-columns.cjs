const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabaseAdmin.from('ongoing_projects').insert({
      created_by: "a49e2832-214d-4821-8c72-45b33d5410c1",
      project_code: "TEST1234",
      project_name: "Test"
  }).select('*');
  
  if (data && data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
      // Clean it up
      await supabaseAdmin.from('ongoing_projects').delete().eq('project_code', "TEST1234");
  } else {
      console.error(error);
  }
}

run();
