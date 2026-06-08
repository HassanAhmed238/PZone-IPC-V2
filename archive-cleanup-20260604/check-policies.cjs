const { createClient } = require('@supabase/supabase-js');

// Create standard postgres client to query pg_policies using the connection string from Supabase
// Wait, I only have the Service Role Key. 
// With Service Role Key, I can query standard tables using REST but not system catalogs like pg_policies.
// Wait, maybe I can just do an RPC if one exists? No.
// Let's just use REST API to check the existence of rows in contracts.
const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testStorageBucket() {
  const { data, error } = await supabaseAdmin.storage.getBucket('contracts');
  console.log("Bucket contracts:", data || error);
}

testStorageBucket();
