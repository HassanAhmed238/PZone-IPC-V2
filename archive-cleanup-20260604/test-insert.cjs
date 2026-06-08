const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });
  
  if (authErr) return console.error("Login failed:", authErr);
  
  const user = auth.user;
  console.log("Logged in user:", user.id);
  
  const { data: roles } = await supabase.from('user_roles').select('*');
  console.log("My roles from API (checking has_role func):", roles);
  
  // get a project id
  const { data: projects } = await supabase.from('ongoing_projects').select('id').limit(1);
  const projectId = projects[0]?.id;
  if (!projectId) return console.log("No projects found");
  
  console.log("Found project:", projectId);
  
  const payload = {
    project_id: projectId,
    created_by: user.id
  };
  
  console.log("Attempting insert with payload:", payload);
  
  const { data, error } = await supabase
    .from('budget_headers')
    .insert(payload)
    .select();
    
  if (error) {
     console.error("Insert Error:", error);
     
     // try RPC call or direct SQL if possible
  } else {
     console.log("Success:", data);
  }
}

testInsert();
