const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Fetching users...");
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  console.log(`Found ${users.length} users.`);
  
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('*');
    
  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return;
  }
  
  users.forEach(u => {
    const userRoles = roles.filter(r => r.user_id === u.id).map(r => r.role);
    console.log(`User ${u.email} (ID: ${u.id}) has roles: ${userRoles.join(', ') || 'NONE'}`);
  });
}

run();
