const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Updating admin user with Service Role key...");
  
  // Get all users
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
      console.error(listError);
      return;
  }
  
  const existing = listData.users.find(u => u.email === 'admin@pzone.com');
  if (existing) {
      const userId = existing.id;
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: 'adminpassword123',
          email_confirm: true
      });
      if (updateErr) console.error("Update Error:", updateErr);
      else console.log("Updated existing admin user.", userId);
      
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id, role' });
        
      if (roleError) console.error("Role Error:", roleError);
      else console.log("Admin role assigned successfully.");
  } else {
      console.log("User not found!");
  }
}

run();
