/**
 * Re-analyze ONLY the تحصيلات (collections) sheet from each Excel file.
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DIR = 'D:\\Pzone\\تحصيلات';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx'));

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s;
}

function toNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

let grandTotal = 0;
let grandEntries = 0;

for (const file of files) {
  const wb = XLSX.readFile(path.join(DIR, file));
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 ${file}`);
  console.log(`   All sheets: ${wb.SheetNames.join(' | ')}`);
  
  // Find ONLY تحصيلات sheet
  const collSheet = wb.SheetNames.find(s => /تحصيلات/i.test(s));
  
  if (!collSheet) {
    console.log(`   ❌ NO تحصيلات sheet found — SKIPPING`);
    continue;
  }
  
  console.log(`   ✅ Using sheet: "${collSheet}"`);
  
  const ws = wb.Sheets[collSheet];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  // Show header
  console.log(`   Rows: ${data.length}`);
  if (data.length > 0) {
    const hdr = data[0].map((c, j) => `[${j}]=${c}`).filter(c => !c.endsWith('='));
    console.log(`   Header: ${hdr.join(' | ')}`);
  }
  
  // Detect amount column (دائن or a numeric column)
  let amountCol = -1;
  for (let j = 0; j < (data[0] || []).length; j++) {
    const h = String(data[0][j] || '').trim();
    if (/دائن|قيمة|مبلغ|تحصيل/.test(h)) { amountCol = j; break; }
  }
  // If not found by header, check which column has the most numbers
  if (amountCol === -1) {
    for (let j = 3; j <= 5; j++) {
      let numCount = 0;
      for (let i = 1; i < Math.min(5, data.length); i++) {
        if (typeof data[i][j] === 'number' && data[i][j] > 0) numCount++;
      }
      if (numCount >= 2) { amountCol = j; break; }
    }
  }
  
  console.log(`   Amount column: [${amountCol}]`);
  console.log(`   ---`);
  
  let monthTotal = 0;
  let entries = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = parseExcelDate(row[0]);
    const client = String(row[1] || '').trim();
    const project = String(row[2] || '').trim();
    const amount = toNum(row[amountCol]);
    const notes = String(row[amountCol + 1] || row[amountCol + 2] || '').trim();
    
    // Skip total rows, empty rows, negative amounts
    if (!date || amount <= 0) continue;
    if (/اجمالي|الاجمالي|total/i.test(project)) continue;
    
    const internalCode = project.match(/^(\d{4})-/) ? project.match(/^(\d{4})-/)[1] : '????';
    entries++;
    monthTotal += amount;
    
    console.log(`   ${date} | ${internalCode.padEnd(5)} | ${amount.toLocaleString().padStart(16)} | ${client.substring(0, 35)}`);
  }
  
  console.log(`\n   📊 TOTAL: ${monthTotal.toLocaleString()} EGP (${entries} entries)`);
  grandTotal += monthTotal;
  grandEntries += entries;
}

console.log(`\n${'='.repeat(70)}`);
console.log(`\n📊 GRAND TOTAL (تحصيلات only): ${grandTotal.toLocaleString()} EGP`);
console.log(`   Total entries: ${grandEntries}`);
