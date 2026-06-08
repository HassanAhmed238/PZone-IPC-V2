const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.replace(/\r/g, '').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    env[match[1].trim()] = val;
  }
});

const PROJECT_ID = env['VITE_SUPABASE_PROJECT_ID'];
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY";
const SUPABASE_URL = env['VITE_SUPABASE_URL'];

const sql = fs.readFileSync(
  path.resolve(__dirname, 'supabase/migrations/20260403180000_contract_analysis_history.sql'),
  'utf-8'
);

async function run() {
  console.log("🚀 Running contract_analysis_history migration...");
  console.log("URL:", SUPABASE_URL);
  console.log("Project:", PROJECT_ID);
  
  // Method 1: Try the rpcs endpoint with raw SQL via service key
  try {
    // Use the PostgREST rpc endpoint with a custom function
    // Actually, let's just call the Supabase Management API
    const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;
    
    console.log("\n📡 Attempting Management API...");
    const res = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (res.ok) {
      console.log("✅ Migration executed successfully via Management API!");
      return;
    }
    console.log("Management API status:", res.status, await res.text());
  } catch (e) {
    console.log("Management API failed:", e.message);
  }

  // Method 2: Try direct PostgREST with service key
  // We can't run DDL via PostgREST, so output instructions
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  Please run this SQL manually in the Supabase SQL Editor:");
  console.log("=".repeat(60));
  console.log("\n🔗 https://supabase.com/dashboard/project/" + PROJECT_ID + "/sql/new\n");
  console.log(sql);
  console.log("\n" + "=".repeat(60));
}

run().catch(err => {
  console.error("Error:", err.message);
});
