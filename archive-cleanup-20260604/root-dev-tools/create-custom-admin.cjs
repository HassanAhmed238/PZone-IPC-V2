const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const email = 'admin@admin.com';
  let password = 'admin';

  // 1. Check if user exists
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return console.error(listError);
  
  let user = listData.users.find(u => u.email === email);
  
  if (user) {
     console.log('User exists, updating password...');
     let { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: password, email_confirm: true
     });
     if (updateErr && updateErr.message.includes("Password should be")) {
        console.log("Password 'admin' too short, using 'admin123' instead.");
        password = 'admin123';
        updateErr = (await supabaseAdmin.auth.admin.updateUserById(user.id, {
           password: password, email_confirm: true
        })).error;
     } else if (updateErr && updateErr.message.includes("weak")) {
        console.log("Password 'admin' too weak, using 'admin123' instead.");
        password = 'admin123';
        updateErr = (await supabaseAdmin.auth.admin.updateUserById(user.id, {
           password: password, email_confirm: true
        })).error;
     }
     if (updateErr) return console.error("Update Error:", updateErr);
  } else {
     console.log('User does not exist, creating...');
     let { data: { user: newUser }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true
     });
     if (createErr && (createErr.message.includes("Password should be") || createErr.message.includes("weak"))) {
        console.log("Password 'admin' too short/weak, using 'admin123' instead.");
        password = 'admin123';
        const res = await supabaseAdmin.auth.admin.createUser({
           email, password, email_confirm: true
        });
        newUser = res.data?.user;
        createErr = res.error;
     }
     if (createErr) return console.error("Create Error:", createErr);
     user = newUser;
  }
  
  // Upsert profile
  await supabaseAdmin.from('profiles').upsert({ id: user.id, user_id: user.id, full_name: 'Administrator' });

  // Assign admin role
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id, role' });
    
  if (roleError) console.error("Role Error:", roleError);
  else console.log(`SUCCESS! Email: ${email} | Password: ${password}`);
}

run();
