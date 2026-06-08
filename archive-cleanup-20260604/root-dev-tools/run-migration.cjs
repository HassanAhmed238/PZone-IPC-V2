const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    env[match[1].trim()] = val;
  }
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];

// Read the migration SQL file
const sqlPath = path.resolve(__dirname, 'supabase/migrations/20260326_phase0_rls_and_tables.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

// We need to use the Management API or pg directly. 
// Since we don't have pg, use the Supabase SQL REST endpoint with service key.
// The service key is needed ONLY for this one-time admin migration task.
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY";

async function runMigration() {
  console.log("🚀 Running Phase 0 Migration...\n");
  
  // Split into individual statements (rough split on semicolons at end of line, skip empty)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) || '';
    console.log(`[${i + 1}/${statements.length}] ${firstLine.trim().substring(0, 80)}...`);
    
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({})
      });
      // This approach won't work for DDL. Use the SQL API instead.
    } catch (e) {
      // ignore, we'll use a different approach
    }
  }
  
  // Use the pg endpoint directly via Supabase's SQL execution
  console.log("\n📡 Executing full migration via Supabase SQL API...");
  
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log("✅ Migration executed successfully!");
  } else {
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response:", text);
    console.log("\n⚠️  If this failed, please run the SQL manually in the Supabase SQL Editor.");
    console.log("📁 File: supabase/migrations/20260326_phase0_rls_and_tables.sql");
  }
}

runMigration().catch(err => {
  console.error("Error:", err.message);
  console.log("\n⚠️  Please run the SQL manually in the Supabase SQL Editor.");
  console.log("📁 File: supabase/migrations/20260326_phase0_rls_and_tables.sql");
});
