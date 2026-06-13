/**
 * Generate SQL INSERT statements for collection data.
 * Run the output in Supabase SQL Editor to bypass RLS.
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DIR = 'D:\\Pzone\\تحصيلات';

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

const NAME_PATTERNS = [
  { pattern: /بحيرات العلمين|أبراج الداون تاون/i, pz: 'PZ-006' },
  { pattern: /soul.*Parcel.*1.*2|soul.*1.*2/i, pz: 'PZ-001' },
  { pattern: /soul.*Parcel.*3.*4|soul.*3.*4/i, pz: 'PZ-002' },
  { pattern: /رأس الحكمة/i, pz: 'PZ-004' },
  { pattern: /ساراي كافانا|sarai/i, pz: 'PZ-015' },
  { pattern: /كابيتال واي|capital way/i, pz: 'PZ-029' },
  { pattern: /سوان ليك.*تجديد|swan.*lake.*تجديد/i, pz: 'PZ-019' },
  { pattern: /توريدات سول.*343|أمر شراء 343/i, pz: 'PZ-033' },
  { pattern: /الجهاز الوطنى/i, pz: null },
];

function matchByName(desc) {
  for (const { pattern, pz } of NAME_PATTERNS) {
    if (pattern.test(desc)) return pz;
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
  return Number(String(val).replace(/[,\s]/g, '')) || 0;
}

function esc(s) { return (s || '').replace(/'/g, "''"); }
function monthStart(d) { return d ? d.slice(0, 7) + '-01' : null; }
function extractCode(p) { const m = String(p || '').match(/^(\d{4})-/); return m ? m[1] : null; }

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx'));
const sql = [];
sql.push('-- Auto-generated collection import from Excel تحصيلات files');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('-- Run this in Supabase SQL Editor\n');
sql.push('BEGIN;\n');

let count = 0;

for (const file of files) {
  const wb = XLSX.readFile(path.join(DIR, file));
  let collSheet = wb.SheetNames.find(s => /تحصيلات/i.test(s));
  if (!collSheet) {
    for (const sn of wb.SheetNames) {
      const preview = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      if (preview.slice(0, 3).flat().join(' ').includes('تحصيلات')) { collSheet = sn; break; }
    }
  }
  if (!collSheet) continue;

  const data = XLSX.utils.sheet_to_json(wb.Sheets[collSheet], { header: 1, defval: '' });

  // Find header row
  let headerRowIdx = 0, amountCol = 3;
  for (let r = 0; r < Math.min(5, data.length); r++) {
    const rowText = (data[r] || []).map(c => String(c || '').trim());
    if (rowText.some(c => /تاريخ|عميل/.test(c))) {
      headerRowIdx = r;
      for (let j = 0; j < rowText.length; j++) {
        if (rowText[j] === 'دائن') { amountCol = j; break; }
      }
      break;
    }
  }

  sql.push(`-- File: ${file} (sheet: ${collSheet})`);

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    const date = parseExcelDate(row[0]);
    const client = String(row[1] || '').trim();
    const project = String(row[2] || '').trim();
    const amount = toNum(row[amountCol]);
    const notes = String(row[amountCol + 1] || '').trim();

    if (!date || amount <= 0) continue;
    if (/اجمالي|الاجمالي|total/i.test(project)) continue;

    const code = extractCode(project);
    let pz = code ? CODE_MAP[code] : null;
    if (!pz) pz = matchByName(project);
    if (!pz) continue;

    const collMonth = monthStart(date);
    const dedupeKey = `excel:${collMonth}:${date}:${code || 'name'}:${amount}`;

    sql.push(`INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)`);
    sql.push(`VALUES ('${esc(pz)}', '${esc(project.substring(0, 200))}', '${esc(client.substring(0, 200))}', '${date}', '${collMonth}', ${(Math.round(amount * 100) / 100).toFixed(2)}, 'EGP', '${esc(notes.substring(0, 500))}', 'import', '${esc(file)}', 'row-${i}', '${esc(dedupeKey)}', 'posted')`);
    sql.push(`ON CONFLICT (dedupe_key) DO NOTHING;\n`);
    count++;
  }
}

sql.push(`\nCOMMIT;`);
sql.push(`\n-- Total: ${count} INSERT statements`);

const outPath = path.join('D:\\Hassan\\ERP\\PZone IPC V2\\scripts', 'import-collections.sql');
fs.writeFileSync(outPath, sql.join('\n'), 'utf8');
console.log(`✅ Generated ${count} INSERT statements → ${outPath}`);
