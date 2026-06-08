/**
 * Generic invoice uploader — reusable for any month.
 * Usage: node scripts/upload_invoices.mjs <json_path> <month_label>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://dwpdrclupradpnsminvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4';

const invoicesPath = process.argv[2] || 'C:/Users/0255/.gemini/antigravity-ide/brain/b5d41a3a-60ef-4ac1-9a1b-ff2c78d03e81/scratch/april2026_invoices.json';
const monthLabel = process.argv[3] || 'April 2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Authenticate
console.log('Authenticating...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@pzone.com',
  password: '010055',
});
if (authError) { console.error('Auth failed:', authError.message); process.exit(1); }
console.log(`Authenticated as: ${authData.user.email}\n`);

// Load invoices
const allInvoices = JSON.parse(readFileSync(invoicesPath, 'utf-8'));
console.log(`Loaded ${allInvoices.length} invoices for ${monthLabel}`);

// Auto-discover valid columns
async function discoverValidColumns(sampleRow) {
  let fieldsToTry = Object.keys(sampleRow);
  const rejected = [];
  while (true) {
    const row = {};
    for (const k of fieldsToTry) row[k] = sampleRow[k];
    const { data, error } = await supabase.from('invoices').insert(row).select();
    if (!error) {
      if (data?.[0]) await supabase.from('invoices').delete().eq('id', data[0].id);
      if (rejected.length > 0) console.log(`Stripped columns: ${rejected.join(', ')}`);
      return new Set(fieldsToTry);
    }
    const match = error.message.match(/Could not find the '(\w+)' column/);
    if (match) { rejected.push(match[1]); fieldsToTry = fieldsToTry.filter(f => f !== match[1]); continue; }
    if (error.message.includes('check') || error.message.includes('violates')) {
      if (fieldsToTry.includes('status')) { rejected.push('status'); fieldsToTry = fieldsToTry.filter(f => f !== 'status'); continue; }
    }
    console.error('Schema error:', error.message); process.exit(1);
  }
}

const validColumns = await discoverValidColumns(allInvoices[0]);
const invoices = allInvoices.map(inv => {
  const c = {};
  for (const [k, v] of Object.entries(inv)) { if (validColumns.has(k)) c[k] = v; }
  return c;
});

// Check existing
const projectCodes = invoices.map(i => i.project_code);
const { data: existing } = await supabase.from('invoices').select('id, project_code, invoice_number').in('project_code', projectCodes);
console.log(`Found ${existing?.length || 0} existing rows\n`);

const existingMap = new Map();
for (const row of (existing || [])) {
  const key = `${row.project_code}::${row.invoice_number || ''}`;
  if (!existingMap.has(key)) existingMap.set(key, []);
  existingMap.get(key).push(row);
}

const toUpdate = [], toInsert = [];
for (const inv of invoices) {
  const key = `${inv.project_code}::${inv.invoice_number || ''}`;
  const matches = existingMap.get(key);
  if (matches?.length > 0) toUpdate.push({ ...inv, id: matches[0].id });
  else toInsert.push(inv);
}

console.log(`Plan: ${toUpdate.length} updates, ${toInsert.length} inserts\n`);

let updateOk = 0, updateFail = 0;
for (const inv of toUpdate) {
  const { id, ...data } = inv;
  const { error } = await supabase.from('invoices').update(data).eq('id', id);
  if (error) { console.error(`  ❌ Update ${inv.project_code}: ${error.message}`); updateFail++; }
  else { console.log(`  ✅ Updated ${inv.project_code} #${inv.invoice_number || '-'}`); updateOk++; }
}

let insertOk = 0, insertFail = 0;
for (let i = 0; i < toInsert.length; i += 10) {
  const batch = toInsert.slice(i, i + 10);
  const { data, error } = await supabase.from('invoices').insert(batch).select();
  if (error) {
    for (const inv of batch) {
      const { error: e2 } = await supabase.from('invoices').insert(inv).select();
      if (e2) { console.error(`  ❌ ${inv.project_code}: ${e2.message}`); insertFail++; }
      else { console.log(`  ✅ ${inv.project_code} #${inv.invoice_number || '-'}`); insertOk++; }
    }
  } else {
    insertOk += (data?.length || batch.length);
    for (const d of (data || batch)) console.log(`  ✅ ${d.project_code} #${d.invoice_number || '-'}`);
  }
}

console.log(`\n=== ${monthLabel} Done ===`);
console.log(`Updated: ${updateOk} ✅  ${updateFail} ❌`);
console.log(`Inserted: ${insertOk} ✅  ${insertFail} ❌`);
console.log(`Total: ${updateOk + insertOk} / ${allInvoices.length}`);

await supabase.auth.signOut();
