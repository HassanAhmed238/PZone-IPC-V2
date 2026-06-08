// Quick test: fetch April 2026 CSV from published sheet and parse it
const PUBLISHED_ID = "2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V";
const APRIL_GID = "801847961";

const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${APRIL_GID}&single=true&output=csv`;

console.log(`Fetching: ${url}\n`);
const response = await fetch(url);
console.log(`Status: ${response.status}`);

const csvText = await response.text();
console.log(`CSV length: ${csvText.length} bytes\n`);

// Quick parse
const lines = csvText.split('\n').filter(l => l.trim());
console.log(`Total lines: ${lines.length}`);

// Show lines that start with PZ-
let dataRows = 0;
for (const line of lines) {
  if (line.startsWith('PZ-') || line.startsWith('"PZ-')) {
    dataRows++;
    const first5 = line.substring(0, 100);
    if (dataRows <= 5) console.log(`  Row ${dataRows}: ${first5}...`);
  }
}
console.log(`\nTotal data rows (PZ-*): ${dataRows}`);

// Check Arabic quality
const arabicMatch = csvText.match(/[\u0600-\u06FF]/);
const presFormMatch = csvText.match(/[\uFB50-\uFDFF\uFE70-\uFEFF]/);
console.log(`\nArabic standard chars present: ${!!arabicMatch}`);
console.log(`Arabic presentation forms present: ${!!presFormMatch} (should be false = clean Arabic)`);

// Extract some Arabic names
const arabicNames = csvText.match(/,([^,"]*[\u0600-\u06FF][^,"]*),/g);
if (arabicNames) {
  console.log(`\nSample Arabic text from sheet:`);
  for (const name of arabicNames.slice(0, 5)) {
    console.log(`  ${name.replace(/^,|,$/g, '')}`);
  }
}
