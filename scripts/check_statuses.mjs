// Extract all unique status values from all months
const P='2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V';
const gids=['710892751','436039118','393117100','801847961','381875970','331791800'];
const statuses = new Set();

for (const g of gids) {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/e/${P}/pub?gid=${g}&single=true&output=csv`);
  const t = await r.text();
  for (const l of t.split('\n')) {
    if (l.startsWith('PZ-') || l.startsWith('"PZ-')) {
      const parts = l.split(',');
      const s = (parts[21] || '').replace(/"/g, '').trim();
      if (s) statuses.add(s);
    }
  }
}
console.log('All statuses found in sheets:');
[...statuses].forEach(s => console.log(`  "${s}"`));
