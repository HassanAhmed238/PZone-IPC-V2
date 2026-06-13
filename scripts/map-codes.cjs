/**
 * Build mapping: Internal project code (2401) → PZ- code (PZ-001)
 * by matching project names between Excel and Google Sheet.
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Step 1: Build project name → PZ code mapping from Google Sheet
function parseCSV(text) {
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows = []; let row = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]; const next = clean[i + 1];
    if (inQuotes) { if (ch === '"' && next === '"') { field += '"'; i++; } else if (ch === '"') { inQuotes = false; } else { field += ch; } continue; }
    if (ch === '"') { inQuotes = true; } else if (ch === ",") { row.push(field.trim()); field = ""; }
    else if (ch === "\n" || (ch === "\r" && next === "\n")) { row.push(field.trim()); if (row.some(v => v !== "")) rows.push(row); row = []; field = ""; if (ch === "\r") i++; }
    else { field += ch; }
  }
  if (field || row.length > 0) { row.push(field.trim()); if (row.some(v => v !== "")) rows.push(row); }
  return rows;
}

const PUBLISHED_ID = "2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V";
const MONTHS = [
  { key: "2026-04", gid: "801847961" },
  { key: "2026-05", gid: "381875970" },
];

async function main() {
  // Get PZ mapping from Google Sheet (April has most projects)
  const pzProjects = new Map(); // project_name → PZ-code
  
  for (const m of MONTHS) {
    const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${m.gid}&single=true&output=csv`;
    const resp = await fetch(url);
    const text = await resp.text();
    const rows = parseCSV(text);
    
    for (const cells of rows) {
      const code = (cells[0] || "").trim();
      const name = (cells[3] || "").trim();
      if (/^PZ-/.test(code) && name) {
        pzProjects.set(name.toLowerCase(), code);
        // Also try shorter match (first part of name before " - ")
        const parts = name.split(' - ');
        if (parts.length > 1) {
          pzProjects.set(parts[0].trim().toLowerCase(), code);
        }
      }
    }
  }
  
  console.log(`Built mapping from Google Sheet: ${pzProjects.size} name→PZ entries\n`);

  // Now parse Excel files and try to match
  const DIR = 'D:\\Pzone\\تحصيلات';
  const FILES = [
    { file: 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', month: '2026-04' },
  ];
  
  for (const config of FILES) {
    const wb = XLSX.readFile(path.join(DIR, config.file));
    const sheetName = wb.SheetNames.find(s => /تحصيلات/.test(s)) || wb.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    
    console.log(`\n📄 ${config.file} → Sheet: ${sheetName}`);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const project = String(row[2] || '').trim();
      const amount = typeof row[3] === 'number' ? row[3] : 0;
      if (amount <= 0 || !project) continue;
      
      const internalCode = project.match(/^(\d{4})-/) ? project.match(/^(\d{4})-/)[1] : '????';
      
      // Try to match to PZ code
      const projectName = project.replace(/^\d{4}-/, '').trim();
      let pzCode = null;
      
      // Try exact match
      for (const [name, code] of pzProjects) {
        if (projectName.toLowerCase().includes(name) || name.includes(projectName.toLowerCase())) {
          pzCode = code;
          break;
        }
      }
      
      // Try partial match on key words
      if (!pzCode) {
        const words = projectName.split(/\s+/).filter(w => w.length > 3);
        for (const [name, code] of pzProjects) {
          const matchCount = words.filter(w => name.includes(w.toLowerCase())).length;
          if (matchCount >= 2) {
            pzCode = code;
            break;
          }
        }
      }
      
      const status = pzCode ? '✅' : '❌';
      console.log(`   ${status} ${internalCode} → ${pzCode || 'UNMAPPED'} | ${amount.toLocaleString().padStart(15)} | ${projectName.substring(0, 50)}`);
    }
  }
  
  // Print the Google Sheet PZ projects for reference
  console.log(`\n\n=== PZ PROJECTS FROM GOOGLE SHEET ===`);
  const seen = new Set();
  for (const [name, code] of pzProjects) {
    if (!seen.has(code)) {
      seen.add(code);
      console.log(`   ${code} → ${name.substring(0, 60)}`);
    }
  }
}

main().catch(console.error);
