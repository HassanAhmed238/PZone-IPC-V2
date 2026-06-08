const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';

async function run() {
  console.log("Reading Contracts OCR Cache migration SQL...");
  const migrationPath = path.join(__dirname, 'supabase/migrations/20260525120000_contract_ocr_column.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log("📡 Executing Contracts OCR migration via Supabase SQL API /pg endpoint...");
  
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
    console.log("✅ Contracts OCR Migration executed successfully!");
  } else {
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response:", text);
    console.log("\n⚠️ Migration execution failed via /pg endpoint. You may need to paste the SQL manually in Supabase SQL editor.");
  }
}

run().catch(err => {
  console.error("Error:", err);
});
