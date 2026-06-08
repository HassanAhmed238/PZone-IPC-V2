// Analyze the actual column structure of the CSV
const P='2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V';

const r = await fetch(`https://docs.google.com/spreadsheets/d/e/${P}/pub?gid=801847961&single=true&output=csv`);
const text = await r.text();

// Proper CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i+1];
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

const rows = parseCSV(text);

// Show header row (row 2 = index 2) with column indices
console.log('=== HEADER ROW (index 2) ===');
const headers = rows[2] || [];
headers.forEach((h, i) => console.log(`  Col ${i}: "${h}"`));

console.log(`\n=== FIRST DATA ROW (PZ-001) ===`);
const pz1 = rows.find(r => r[0]?.startsWith('PZ-001'));
if (pz1) {
  pz1.forEach((v, i) => {
    const header = headers[i] || '??';
    console.log(`  Col ${i} (${header}): "${v}"`);
  });
  console.log(`  Total columns: ${pz1.length}`);
}

console.log(`\n=== COLUMN COUNT PER ROW ===`);
const pzRows = rows.filter(r => r[0]?.startsWith('PZ-'));
const colCounts = {};
pzRows.forEach(r => { colCounts[r.length] = (colCounts[r.length]||0)+1; });
console.log(colCounts);

// Check what's in col 21 for PZ rows
console.log(`\n=== STATUS VALUES (col 21) ===`);
const statuses = new Set();
pzRows.forEach(r => { if (r[21]) statuses.add(r[21]); });
console.log([...statuses]);
