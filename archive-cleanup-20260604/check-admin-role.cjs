const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
      console.error("Auth error:", authError);
      return;
  }
  const adminUser = users.find(u => u.email === 'admin@pzone.com');
  console.log("Admin user:", adminUser ? adminUser.id : 'Not found');

  if (adminUser) {
      const { data: rolesData, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', adminUser.id);
      
      console.log("Roles for admin:", rolesData, rolesError);
  }
}

run();
