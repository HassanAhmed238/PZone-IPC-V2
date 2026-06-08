const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';

async function run() {
  console.log("Reading Invoice details migration SQL...");
  const migrationPath = 'd:\\Hassan\\ERP\\PZone Unified\\supabase\\migrations\\20260526_invoice_details.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log("📡 Executing invoice migration via Supabase SQL API /pg endpoint...");
  
  const res = await fetch(`${supabaseUrl}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log("✅ Invoice columns migration executed successfully via /pg!");
  } else {
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response:", text);
    
    console.log("\n📡 Let's try the alternate /rest/v1/rpc/exec_sql endpoint if it exists...");
    const res2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql })
    });
    
    if (res2.ok) {
      console.log("✅ Invoice columns migration executed successfully via exec_sql RPC!");
    } else {
      const text2 = await res2.text();
      console.log("Response2 status:", res2.status);
      console.log("Response2:", text2);
      console.log("\n⚠️ Programmatic migration failed. The user will need to run the SQL query manually in Supabase SQL editor.");
    }
  }
}

run().catch(err => {
  console.error("Error:", err);
});
