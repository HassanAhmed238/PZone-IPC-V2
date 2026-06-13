/**
 * Import Excel collection data (تحصيلات sheets only) into Supabase.
 * 
 * Usage:
 *   node scripts/import-collections.cjs            # dry-run (shows what would be inserted)
 *   node scripts/import-collections.cjs --commit   # actually insert into Supabase
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const COMMIT = process.argv.includes('--commit');
const DIR = 'D:\\Pzone\\تحصيلات';

const supabase = createClient(
  'https://dwpdrclupradpnsminvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4'
);

// ── Internal code → PZ code mapping (built from Google Sheet) ──
const CODE_MAP = {
  '1029': 'PZ-035', '1040': 'PZ-038', '1055': null,     '1059': null,
  '1061': null,      '1070': 'PZ-033', '1076': null,     '1077': null,
  '1078': 'PZ-025', '1079': 'PZ-034', '1081': null,
  '2119': 'PZ-030', '2131': 'PZ-032', '2265': 'PZ-037',
  '2269': 'PZ-029', '2308': 'PZ-018', '2309': 'PZ-026',
  '2325': 'PZ-023', '2333': 'PZ-028', '2401': 'PZ-001',
  '2402': 'PZ-002', '2403': 'PZ-003', '2404': 'PZ-009',
  '2405': 'PZ-006', '2406': 'PZ-031', '2409': null,
  '2412': 'PZ-013', '2413': 'PZ-015', '2414': 'PZ-021',
  '2415': 'PZ-025', '2419': 'PZ-005', '2421': 'PZ-007',
  '2422': 'PZ-008', '2504': 'PZ-019', '2506': 'PZ-006',
  '2508': 'PZ-004', '2510': 'PZ-014', '2511': 'PZ-004',
  '2512': 'PZ-009', '2602': null,      '2603': 'PZ-036',
};

// Fallback: match by keywords in project name for entries without XXXX- prefix
const NAME_PATTERNS = [
  { pattern: /بحيرات العلمين|أبراج الداون تاون/i, pz: 'PZ-006' },
  { pattern: /soul.*Parcel.*1.*2|soul.*1.*2/i, pz: 'PZ-001' },
  { pattern: /soul.*Parcel.*3.*4|soul.*3.*4/i, pz: 'PZ-002' },
  { pattern: /رأس الحكمة/i, pz: 'PZ-004' },
  { pattern: /ساراي كافانا|sarai/i, pz: 'PZ-015' },
  { pattern: /كابيتال واي|capital way/i, pz: 'PZ-029' },
  { pattern: /سوان ليك.*تجديد|swan.*lake.*تجديد/i, pz: 'PZ-019' },
  { pattern: /توريدات سول.*343|أمر شراء 343/i, pz: 'PZ-033' },
  { pattern: /الجهاز الوطنى/i, pz: null }, // national authority — not PZ
];

function matchByName(projectDesc) {
  for (const { pattern, pz } of NAME_PATTERNS) {
    if (pattern.test(projectDesc)) return pz;
  }
  return null;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function toNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function extractInternalCode(project) {
  if (!project) return null;
  const m = String(project).trim().match(/^(\d{4})-/);
  return m ? m[1] : null;
}

function monthStart(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 7) + '-01';
}

async function main() {
  console.log(COMMIT ? '🔴 COMMIT MODE — will INSERT to Supabase' : '🟡 DRY-RUN — no changes');
  console.log('');

  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx'));
  const allRows = [];
  const unmapped = [];

  for (const file of files) {
    const wb = XLSX.readFile(path.join(DIR, file));
    // Find sheet named تحصيلات, OR fall back to a sheet whose first rows contain the word
    let collSheet = wb.SheetNames.find(s => /تحصيلات/i.test(s));
    if (!collSheet) {
      for (const sn of wb.SheetNames) {
        const preview = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
        const top3 = preview.slice(0, 3).flat().join(' ');
        if (/تحصيلات/.test(top3)) { collSheet = sn; break; }
      }
    }
    if (!collSheet) {
      console.log(`⚠️  ${file}: no تحصيلات sheet — skipped`);
      continue;
    }

    const data = XLSX.utils.sheet_to_json(wb.Sheets[collSheet], { header: 1, defval: '' });
    console.log(`📄 ${file} → "${collSheet}" (${data.length} rows)`);

    // Find header row (may not be row 0 — Jan has title in row 0, header in row 1)
    let headerRowIdx = 0;
    let amountCol = 3; // default fallback
    for (let r = 0; r < Math.min(5, data.length); r++) {
      const rowText = (data[r] || []).map(c => String(c || '').trim());
      const hasCols = rowText.some(c => /تاريخ|عميل/.test(c));
      if (hasCols) {
        headerRowIdx = r;
        // Find دائن column
        for (let j = 0; j < rowText.length; j++) {
          if (rowText[j] === 'دائن') { amountCol = j; break; }
          if (/قيمة|مبلغ/.test(rowText[j])) { amountCol = j; }
        }
        break;
      }
    }

    const notesCol = amountCol + 1;
    const dataStartRow = headerRowIdx + 1;

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const date = parseExcelDate(row[0]);
      const client = String(row[1] || '').trim();
      const project = String(row[2] || '').trim();
      const amount = toNum(row[amountCol]);
      const notes = String(row[notesCol] || '').trim();

      if (!date || amount <= 0) continue;
      if (/اجمالي|الاجمالي|total/i.test(project)) continue;

      const internalCode = extractInternalCode(project);
      let pzCode = internalCode ? CODE_MAP[internalCode] : null;
      // Fallback: try matching by project name keywords
      if (!pzCode) pzCode = matchByName(project);

      if (!pzCode) {
        unmapped.push({ date, internalCode, project: project.substring(0, 60), amount, client, file });
        continue;
      }

      const collMonth = monthStart(date);
      const dedupeKey = `excel:${collMonth}:${date}:${internalCode}:${amount}`;

      allRows.push({
        project_code: pzCode,
        project_name: project.substring(0, 200),
        invoice_id: null,
        invoice_number: null,
        client: client.substring(0, 200),
        collection_date: date,
        collection_month: collMonth,
        amount: Math.round(amount * 100) / 100,
        currency: 'EGP',
        reference_no: null,
        bank_account: null,
        notes: notes.substring(0, 500) || null,
        source_type: 'import',
        source_file_name: file,
        source_row_key: `row-${i}`,
        dedupe_key: dedupeKey,
        status: 'posted',
      });
    }
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Mapped entries:   ${allRows.length}`);
  console.log(`❌ Unmapped entries: ${unmapped.length}`);

  if (unmapped.length > 0) {
    console.log(`\n--- UNMAPPED (will NOT be imported) ---`);
    for (const u of unmapped) {
      console.log(`   ${u.date} | ${u.internalCode || '????'} | ${u.amount.toLocaleString().padStart(15)} | ${u.client.substring(0, 30)} | ${u.project.substring(0, 40)}`);
    }
  }

  // Per-month breakdown
  const byMonth = {};
  for (const r of allRows) {
    if (!byMonth[r.collection_month]) byMonth[r.collection_month] = { count: 0, total: 0 };
    byMonth[r.collection_month].count++;
    byMonth[r.collection_month].total += r.amount;
  }
  console.log(`\n--- PER-MONTH BREAKDOWN ---`);
  for (const [m, info] of Object.entries(byMonth).sort()) {
    console.log(`   ${m}: ${info.count} entries → ${info.total.toLocaleString()} EGP`);
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN complete. Run with --commit to insert.`);
    return;
  }

  // ── Guard: check for potential duplicates with existing data ──
  console.log(`\n🔍 Checking for duplicates with existing collection_transactions...`);
  const { data: existing, error: existErr } = await supabase
    .from('collection_transactions')
    .select('project_code,collection_month,amount,dedupe_key,source_type')
    .neq('status', 'reversed');

  if (existErr) {
    console.log(`   ⚠️ Could not check existing: ${existErr.message}`);
    if (/does not exist/i.test(existErr.message)) {
      console.log(`   ❌ Table does not exist! Run the migration first:`);
      console.log(`      supabase/migrations/20260605_financial_ledgers.sql`);
      return;
    }
  }

  const existingSet = new Set((existing || []).map(r => `${r.project_code}|${r.collection_month}|${r.amount}`));
  const existingDedupeKeys = new Set((existing || []).map(r => r.dedupe_key));
  let dupeCount = 0;
  const deduped = [];

  for (const row of allRows) {
    // Skip if exact dedupe_key already exists
    if (existingDedupeKeys.has(row.dedupe_key)) {
      console.log(`   ⏭️  SKIP (exact dedupe): ${row.project_code} ${row.collection_date} ${row.amount.toLocaleString()}`);
      dupeCount++;
      continue;
    }
    // Warn (but still import) if same project+month+amount exists from different source
    const softKey = `${row.project_code}|${row.collection_month}|${row.amount}`;
    if (existingSet.has(softKey)) {
      console.log(`   ⚠️  POSSIBLE DUPE: ${row.project_code} ${row.collection_month} ${row.amount.toLocaleString()} (already exists from another source)`);
    }
    deduped.push(row);
  }

  console.log(`   Existing rows: ${(existing || []).length} | Exact dupes skipped: ${dupeCount} | To insert: ${deduped.length}`);

  if (deduped.length === 0) {
    console.log(`\n✅ Nothing to insert — all entries already exist.`);
    return;
  }

  // ── Insert in batches ──
  console.log(`\n🔴 Inserting ${deduped.length} rows into collection_transactions...`);
  const BATCH = 20;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('collection_transactions')
      .upsert(batch, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.log(`   ❌ Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += (data || []).length;
      skipped += batch.length - (data || []).length;
      console.log(`   ✅ Batch ${Math.floor(i / BATCH) + 1}: ${(data || []).length} inserted`);
    }
  }

  console.log(`\n📊 RESULT: ${inserted} inserted, ${skipped} skipped (duplicates), ${errors} errors`);
}

main().catch(console.error);
