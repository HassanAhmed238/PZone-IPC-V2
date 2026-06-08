const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabase = createClient(supabaseUrl, supabaseKey); // Service Role Key

async function run() {
  console.log("1. Updating currency in ongoing_projects to EGP...");
  // Try to update currency column (if it exists)
  const { data: updateData, error: updateErr } = await supabase
    .from('ongoing_projects')
    .update({ currency: 'EGP' })
    .neq('currency', 'EGP')
    .select('id, project_name, currency');
    
  if (updateErr) {
    console.log("Update currency error (column might not exist):", updateErr.message);
  } else {
    console.log("Updated projects to EGP:", updateData?.length);
  }

  console.log("\n2. Testing Budget Insert with Service Role (Bypassing RLS)...");
  
  // We need the admin user's ID
  const { data: list } = await supabase.auth.admin.listUsers();
  const user = list.users.find(u => u.email === 'admin@admin.com');
  
  // Get a project ID
  const { data: projects } = await supabase.from('ongoing_projects').select('id').limit(1);
  const projectId = projects[0]?.id;
  
  if (user && projectId) {
    const payload = {
      project_id: projectId,
      created_by: user.id
    };
    console.log("Inserting budget payload:", payload);
    const { data: insertData, error: insertErr } = await supabase
      .from('budget_headers')
      .insert(payload)
      .select();
      
    if (insertErr) {
      console.log("Service Role Insert Error:", insertErr);
    } else {
      console.log("Service Role Insert Success!", insertData);
      
      // Clean up the test row
      await supabase.from('budget_headers').delete().eq('id', insertData[0].id);
    }
  }
}

run();
