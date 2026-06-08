/**
 * Sync ALL months (Jan–Jun 2026) from Google Sheet → Supabase.
 * Handles schema constraints by:
 * 1. Excluding 'status' column (has a check constraint)  
 * 2. Converting $ values properly
 * Run: node scripts/sync_all_months.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dwpdrclupradpnsminvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4';
const PUBLISHED_ID = '2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V';

const MONTHS = [
  { key: '2026-01', label: 'January 2026', gid: '710892751' },
  { key: '2026-02', label: 'February 2026', gid: '436039118' },
  { key: '2026-03', label: 'March 2026', gid: '393117100' },
  { key: '2026-04', label: 'April 2026', gid: '801847961' },
  { key: '2026-05', label: 'May 2026', gid: '381875970' },
  { key: '2026-06', label: 'June 2026', gid: '331791800' },
];

// ─── CSV Parser ───
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        row.push(field.trim());
        if (row.some(v => v !== '')) rows.push(row);
        row = []; field = '';
        if (ch === '\r') i++;
      } else field += ch;
    }
  }
  if (field || row.length > 0) { row.push(field.trim()); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}

// ─── Helpers ───
function toNum(v) {
  if (!v) return 0;
  const c = String(v).replace(/[,\s%$]/g, '').trim();
  if (!c || c === '-' || c === 'N/A' || c === '(' || c === ')') return 0;
  // Handle parenthesized negatives: (1,234.56) = -1234.56
  const neg = c.startsWith('(') && c.endsWith(')');
  const cleaned = neg ? c.slice(1, -1) : c;
  const n = Number(cleaned);
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
}

function toDate(v) {
  if (!v || v.trim() === '' || v.trim() === '-') return null;
  const raw = v.trim().replace(/-$/, '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmy = raw.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
  if (dmy) {
    const [, d, mon, y] = dmy;
    const m = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' }[mon.toLowerCase().slice(0,3)];
    if (m) return `${y.length === 2 ? '20' + y : y}-${m}-${d.padStart(2, '0')}`;
  }
  const slash = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slash) { const [, d, m, y] = slash; return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  return null;
}

// Map Arabic status to allowed DB values
const STATUS_MAP = {
  'معتمد': 'approved',
  'تحت الاعتماد': 'pending',
  'تحت الإعتماد': 'pending',
  'مرفوض': 'rejected',
  'في انتظار النسخة المعتمدة': 'pending',
  'لم يتم اعتماد السابق': 'draft',
};

function mapStatus(arabicStatus) {
  if (!arabicStatus) return 'draft';
  const mapped = STATUS_MAP[arabicStatus.trim()];
  return mapped || 'draft';
}

function rowToInvoice(cells, monthKey) {
  const pc = (cells[0] || '').trim();
  if (!pc || !/^(PZ-|\d)/.test(pc)) return null;
  if (/^total|^إجمالي|^الإجمالي|^الاجمالي/i.test(pc)) return null;
  if (!cells[3]?.trim() && !cells[4]?.trim()) return null;
  
  const arabicStatus = (cells[21] || '').trim();
  
  return {
    project_code: pc,
    sector: (cells[1] || '').trim(),
    submitted_date: toDate(cells[2]),
    project_name: (cells[3] || '').trim(),
    client: (cells[4] || '').trim(),
    contract_value: toNum(cells[5]),
    invoice_number: cells[6]?.trim() || null,
    work_previous: toNum(cells[7]),
    work_current: toNum(cells[8]),
    work_total: toNum(cells[9]),
    total_deductions: toNum(cells[10]),
    net_previous: toNum(cells[11]),
    net_current: toNum(cells[12]),
    net_total: toNum(cells[13]),
    approved_previous: toNum(cells[14]),
    approved_current: toNum(cells[15]),
    approved_total: toNum(cells[16]),
    approved_deductions: toNum(cells[17]),
    approved_net_previous: toNum(cells[18]),
    approved_net_current: toNum(cells[19]),
    approved_net_total: toNum(cells[20]),
    status: mapStatus(arabicStatus),
    approval_date: toDate(cells[22]),
    contract_percentage: toNum(cells[24]),
    total_collections: toNum(cells[26]),
    expected_collection: toNum(cells[27]),
    invoice_type: 'submitted',
    // Store original Arabic for reference
    month: monthKey,
  };
}

// ─── Main ───
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email: 'admin@pzone.com', password: '010055' });
if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
console.log('✅ Authenticated\n');

// Clear existing
console.log('🗑️  Clearing existing invoices...');
const { data: allExisting } = await supabase.from('invoices').select('id');
if (allExisting?.length > 0) {
  for (let i = 0; i < allExisting.length; i += 50) {
    const batch = allExisting.slice(i, i + 50).map(r => r.id);
    await supabase.from('invoices').delete().in('id', batch);
  }
  console.log(`   Deleted ${allExisting.length} old rows\n`);
} else {
  console.log('   No existing rows\n');
}

// Discover valid columns with first row
let validCols = null;

const grandTotal = { inserted: 0, errors: 0, skipped: 0 };

for (const month of MONTHS) {
  console.log(`\n━━━ ${month.label} ━━━`);
  const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${month.gid}&single=true&output=csv`;
  
  try {
    const resp = await fetch(url);
    if (!resp.ok) { console.log(`  ❌ HTTP ${resp.status}`); grandTotal.errors++; continue; }
    
    const csv = await resp.text();
    if (csv.trim().startsWith('<!') || csv.trim().startsWith('<html')) {
      console.log('  ❌ Got HTML'); grandTotal.errors++; continue;
    }
    
    const rows = parseCSV(csv);
    const invoices = rows.map(r => rowToInvoice(r, month.key)).filter(Boolean);
    console.log(`  📊 ${invoices.length} invoices parsed`);
    
    if (invoices.length === 0) { console.log('  ⚪ No data'); continue; }
    
    // Auto-discover columns on first attempt
    if (!validCols) {
      validCols = new Set(Object.keys(invoices[0]));
      // Remove 'month' field (not in DB)
      validCols.delete('month');
      
      // Test which columns the DB accepts
      const testRow = {};
      for (const [k, v] of Object.entries(invoices[0])) {
        if (validCols.has(k)) testRow[k] = v;
      }
      
      let attempts = 0;
      while (attempts < 10) {
        const { error } = await supabase.from('invoices').insert(testRow).select();
        if (!error) {
          // Success - delete the test row
          const { data: found } = await supabase.from('invoices').select('id')
            .eq('project_code', testRow.project_code).limit(1);
          if (found?.[0]) await supabase.from('invoices').delete().eq('id', found[0].id);
          break;
        }
        // Remove problematic column
        const colMatch = error.message.match(/column (?:invoices\.)?["']?(\w+)["']? (?:does not exist|of relation)/i)
          || error.message.match(/Could not find the '(\w+)' column/);
        if (colMatch) {
          console.log(`  🔧 Removing invalid column: ${colMatch[1]}`);
          validCols.delete(colMatch[1]);
          delete testRow[colMatch[1]];
          attempts++;
          continue;
        }
        console.log(`  ⚠️ Schema: ${error.message}`);
        break;
      }
      console.log(`  🔧 Valid columns: ${validCols.size}`);
    }
    
    // Insert all rows
    let ok = 0, fail = 0;
    for (const inv of invoices) {
      const row = {};
      for (const [k, v] of Object.entries(inv)) {
        if (validCols.has(k)) row[k] = v;
      }
      
      const { error } = await supabase.from('invoices').insert(row).select();
      if (error) {
        console.log(`    ❌ ${inv.project_code}: ${error.message}`);
        fail++;
      } else {
        ok++;
      }
    }
    
    console.log(`  ✅ ${ok} inserted, ${fail} failed`);
    grandTotal.inserted += ok;
    grandTotal.errors += fail;
    
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    grandTotal.errors++;
  }
}

console.log('\n\n════════════════════════════════════════');
console.log('📊 SYNC COMPLETE');
console.log(`   Total inserted: ${grandTotal.inserted}`);
console.log(`   Errors: ${grandTotal.errors}`);
console.log('════════════════════════════════════════\n');

// Verify
const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
console.log(`📋 Total invoices in Supabase: ${count}`);

// Show breakdown by status
const { data: statusBreakdown } = await supabase.from('invoices').select('status');
const statusCounts = {};
(statusBreakdown || []).forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
console.log('\n📊 Status distribution:', statusCounts);

// Show sample
const { data: samples } = await supabase.from('invoices').select('project_code, client, project_name, status, contract_value').limit(5);
console.log('\n📝 Sample rows:');
for (const s of samples || []) {
  console.log(`   ${s.project_code} | ${s.client} | ${s.status} | EGP ${s.contract_value?.toLocaleString()}`);
}

await supabase.auth.signOut();
