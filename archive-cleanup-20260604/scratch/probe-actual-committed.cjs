const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://dwpdrclupradpnsminvi.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4");
async function run() {
  const res1 = await supabase.from('contract_module_access').select('allowed_roles').limit(1);
  console.log('allowed_roles select:', res1.error ? 'FAILED' : 'SUCCESS', res1.error);

  const res2 = await supabase.from('contract_module_access').select('role').limit(1);
  console.log('role select:', res2.error ? 'FAILED' : 'SUCCESS', res2.error);
}
run();
