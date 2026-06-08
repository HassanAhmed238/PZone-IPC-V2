import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { writeFileSync } from 'fs';

const filePath = "C:\\Users\\0255\\Downloads\\Pzone Invoices 2026 (1).xlsx";
const wb = readFile(filePath);

function num(v) {
  if (v === '' || v === '-' || v === null || v === undefined) return 0;
  const n = Number(v);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function excelDate(v) {
  if (!v || v === '-') return null;
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function str(v) {
  if (v === '' || v === null || v === undefined || v === '-') return null;
  return String(v).trim();
}

function parseSheet(sheetName, monthLabel) {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.log(`Sheet "${sheetName}" not found!`); return []; }
  const json = utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  const rows = [];
  for (let i = 4; i < json.length; i++) {
    const r = json[i];
    const code = str(r[0]);
    if (!code || !code.startsWith('PZ-')) continue;
    
    const inv = str(r[6]);
    const total = num(r[9]);
    const hasInvoiceData = inv || total > 0;
    
    rows.push({
      code,
      sector: str(r[1]),
      submitted: excelDate(r[2]),
      name: str(r[3]) || code,
      client: str(r[4]),
      contract: num(r[5]),
      inv,
      prev: num(r[7]),
      curr: num(r[8]),
      total,
      ded: num(r[10]),
      netPrev: num(r[11]),
      netCurr: num(r[12]),
      netTotal: num(r[13]),
      appPrev: num(r[14]),
      appCurr: num(r[15]),
      appTotal: num(r[16]),
      appDed: num(r[17]),
      appNetPrev: num(r[18]),
      appNetCurr: num(r[19]),
      appNetTotal: num(r[20]),
      status: str(r[21]) || (hasInvoiceData ? 'تحت الاعتماد' : 'لا يوجد مستخلص'),
      approval: excelDate(r[22]),
      projectStatus: str(r[23]),
      pct: num(r[24]),
      monthlyCollections: num(r[25]),
      totalCollections: num(r[26]),
      expected: num(r[27]),
      _month: monthLabel,
      _hasData: hasInvoiceData,
    });
  }
  return rows;
}

// Parse all three months
const april = parseSheet("April 2026 ", "2026-04");
const may = parseSheet("May 2026 ", "2026-05");
const june = parseSheet("June 2026", "2026-06");

console.log(`April: ${april.length} rows, May: ${may.length} rows, June: ${june.length} rows`);

// For each project, pick the BEST data across months:
// - Use latest month that has invoice data
// - Accumulate monthly collections
const projectMap = new Map();

function mergeProject(row) {
  const code = row.code;
  const existing = projectMap.get(code);
  
  if (!existing) {
    projectMap.set(code, { ...row, aprColl: 0, mayColl: 0, junColl: 0 });
    return;
  }
  
  // Always update contract value, client, sector, name from latest
  existing.contract = row.contract || existing.contract;
  existing.client = row.client || existing.client;
  existing.sector = row.sector || existing.sector;
  existing.name = row.name || existing.name;
  existing.projectStatus = row.projectStatus || existing.projectStatus;
  
  // If this month has invoice data and is more recent, use its invoice data
  if (row._hasData) {
    const existingInvNum = parseFloat(String(existing.inv || '0').replace(/[^\d.]/g, '')) || 0;
    const rowInvNum = parseFloat(String(row.inv || '0').replace(/[^\d.]/g, '')) || 0;
    const isNewer = row._month > existing._month || rowInvNum > existingInvNum || row.total > existing.total;
    
    if (isNewer || !existing._hasData) {
      existing.inv = row.inv || existing.inv;
      existing.submitted = row.submitted || existing.submitted;
      existing.prev = row.prev;
      existing.curr = row.curr;
      existing.total = row.total;
      existing.ded = row.ded;
      existing.netPrev = row.netPrev;
      existing.netCurr = row.netCurr;
      existing.netTotal = row.netTotal;
      existing.appPrev = row.appPrev;
      existing.appCurr = row.appCurr;
      existing.appTotal = row.appTotal;
      existing.appDed = row.appDed;
      existing.appNetPrev = row.appNetPrev;
      existing.appNetCurr = row.appNetCurr;
      existing.appNetTotal = row.appNetTotal;
      existing.status = row.status;
      existing.approval = row.approval || existing.approval;
      existing.pct = row.pct || existing.pct;
      existing._hasData = true;
      existing._month = row._month;
    }
  }
}

// Process in order: April first, then May, then June (so latest wins)
for (const row of april) {
  mergeProject(row);
  if (projectMap.has(row.code)) projectMap.get(row.code).aprColl = row.monthlyCollections;
}
for (const row of may) {
  mergeProject(row);
  if (projectMap.has(row.code)) projectMap.get(row.code).mayColl = row.monthlyCollections;
}
for (const row of june) {
  mergeProject(row);
  if (projectMap.has(row.code)) projectMap.get(row.code).junColl = row.monthlyCollections;
}

// Build final output
const finalRows = Array.from(projectMap.values()).map(r => ({
  code: r.code,
  sector: r.sector,
  submitted: r.submitted,
  name: r.name,
  client: r.client,
  contract: r.contract,
  inv: r.inv,
  prev: r.prev,
  curr: r.curr,
  total: r.total,
  ded: r.ded,
  netPrev: r.netPrev,
  netCurr: r.netCurr,
  netTotal: r.netTotal,
  appPrev: r.appPrev,
  appCurr: r.appCurr,
  appTotal: r.appTotal,
  appDed: r.appDed,
  appNetPrev: r.appNetPrev,
  appNetCurr: r.appNetCurr,
  appNetTotal: r.appNetTotal,
  status: r.status,
  approval: r.approval,
  projectStatus: r.projectStatus,
  pct: r.pct,
  collections: r.aprColl + r.mayColl + r.junColl,
  expected: r.expected || 0,
}));

console.log(`\n=== Final ${finalRows.length} projects ===`);
for (const r of finalRows) {
  const coll = r.collections > 0 ? ` | collections: ${r.collections.toLocaleString()}` : '';
  console.log(`${r.code} | inv: ${r.inv || '-'} | total: ${r.total.toLocaleString()} | status: ${r.status}${coll}`);
}

writeFileSync('scripts/seed_data_apr_jun_2026.json', JSON.stringify(finalRows, null, 2));
console.log('\nSaved to scripts/seed_data_apr_jun_2026.json');
