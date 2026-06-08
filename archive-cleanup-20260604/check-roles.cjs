const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: list } = await supabase.auth.admin.listUsers();
  const user = list.users.find(u => u.email === 'admin@admin.com');
  if (!user) return console.log('user not found');
  console.log('User ID:', user.id);
  
  const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', user.id);
  console.log('Roles:', roles);
}

check();
