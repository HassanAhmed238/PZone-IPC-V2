const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Removing allowed_mime_types restriction from bucket...");
  const { data, error } = await supabaseAdmin.storage.updateBucket('contracts', {
    allowedMimeTypes: null, // Allow all mime types to bypass strict browser type checking
    fileSizeLimit: 52428800, // 50MB
    public: false
  });
  
  if (error) {
    console.error("Error updating bucket:", error);
  } else {
    console.log("Bucket updated successfully!", data);
  }
}

run();
