/**
 * audit-sync.cjs — Data Integrity Audit
 *
 * Compares Google Sheet source data against Supabase database rows.
 * Reports:
 *   1. Rows in Sheet but NOT in Supabase (missing syncs)
 *   2. Rows in Supabase but NOT in Sheet (orphans)
 *   3. Value mismatches between Sheet and Supabase
 *   4. Source data quality issues (bad dates, negative amounts, missing fields, etc.)
 *   5. Collection sync verification
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://dwpdrclupradpnsminvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4";

const SPREADSHEET_ID = "1fRZO0vNpkwn6Dowv_6tXiof-3LXp0uE5NmhzUmmyOiY";
const PUBLISHED_ID = "2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V";

const MONTH_CONFIGS = [
  { key: "2026-01", label: "January 2026", gid: "710892751" },
  { key: "2026-02", label: "February 2026", gid: "436039118" },
  { key: "2026-03", label: "March 2026", gid: "393117100" },
  { key: "2026-04", label: "April 2026", gid: "801847961" },
  { key: "2026-05", label: "May 2026", gid: "381875970" },
  { key: "2026-06", label: "June 2026", gid: "331791800" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Parsing utilities (mirrored from sheetSync.ts) ---

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
      continue;
    }

    if (ch === '"') { inQuotes = true; }
    else if (ch === ",") { row.push(field.trim()); field = ""; }
    else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field.trim());
      if (row.some(v => v !== "")) rows.push(row);
      row = []; field = "";
      if (ch === "\r") i++;
    } else { field += ch; }
  }

  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(v => v !== "")) rows.push(row);
  }
  return rows;
}

function toNumber(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[,\s%$]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned.toUpperCase() === "N/A") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toDate(value) {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const raw = value.trim().replace(/-$/, "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const dmy = raw.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
  if (dmy) {
    const [, d, mon, y] = dmy;
    const months = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
    const m = months[mon.toLowerCase().slice(0,3)];
    if (m) return `${y.length===2?`20${y}`:y}-${m}-${d.padStart(2,"0")}`;
  }

  const slash = raw.match(/^(\d{1,2})[/\-.](\\d{1,2})[/\-.](\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return null;
}

const STATUS_MAP = {
  'معتمد': 'approved',
  'تحت الاعتماد': 'pending',
  'تحت الإعتماد': 'pending',
  'مرفوض': 'rejected',
  'في انتظار النسخة المعتمدة': 'pending',
  'لم يتم اعتماد السابق': 'draft',
};

function mapStatus(s) { return (!s ? 'draft' : STATUS_MAP[s.trim()] || 'draft'); }

function rowToInvoice(cells) {
  const projectCode = (cells[0] || "").trim();
  if (!projectCode) return null;
  if (!/^(PZ-|\d)/.test(projectCode)) return null;
  if (/^total|^الإجمالي|^اجمالي|^اجمالى/i.test(projectCode)) return null;
  if (!cells[3]?.trim() && !cells[4]?.trim()) return null;

  const hasProjectStatusColumn = cells.length >= 28;
  const pctIdx = hasProjectStatusColumn ? 24 : 23;
  const mCollIdx = hasProjectStatusColumn ? 25 : 24;
  const tCollIdx = hasProjectStatusColumn ? 26 : 25;
  const eCollIdx = hasProjectStatusColumn ? 27 : 26;

  return {
    project_code: projectCode,
    sector: (cells[1] || "").trim(),
    submitted_date: toDate(cells[2]),
    project_name: (cells[3] || "").trim(),
    client: (cells[4] || "").trim(),
    contract_value: toNumber(cells[5]),
    invoice_number: cells[6]?.trim() || null,
    work_previous: toNumber(cells[7]),
    work_current: toNumber(cells[8]),
    work_total: toNumber(cells[9]),
    total_deductions: toNumber(cells[10]),
    net_previous: toNumber(cells[11]),
    net_current: toNumber(cells[12]),
    net_total: toNumber(cells[13]),
    approved_previous: toNumber(cells[14]),
    approved_current: toNumber(cells[15]),
    approved_total: toNumber(cells[16]),
    approved_deductions: toNumber(cells[17]),
    approved_net_previous: toNumber(cells[18]),
    approved_net_current: toNumber(cells[19]),
    approved_net_total: toNumber(cells[20]),
    status: mapStatus((cells[21] || "").trim()),
    approval_date: toDate(cells[22]),
    contract_percentage: toNumber(cells[pctIdx]),
    collection_current: toNumber(cells[mCollIdx]),
    total_collections: toNumber(cells[tCollIdx]),
    expected_collection: toNumber(cells[eCollIdx]),
  };
}

// --- Fetch from Google Sheets ---

async function fetchSheetCSV(gid) {
  const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
  const resp = await fetch(url);
  if (!resp.ok) {
    // Fallback to gviz
    const url2 = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const resp2 = await fetch(url2);
    if (!resp2.ok) throw new Error(`Failed to fetch sheet gid=${gid}: ${resp2.status}`);
    return resp2.text();
  }
  const text = await resp.text();
  if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
    throw new Error(`Sheet gid=${gid} returned HTML instead of CSV`);
  }
  return text;
}

async function fetchMonthInvoices(config) {
  const csv = await fetchSheetCSV(config.gid);
  const rows = parseCSV(csv);
  // Check if it's an IPC sheet
  const isIpc = rows.some(row => {
    const norm = row.map(c => String(c||"").trim().toLowerCase());
    return norm[0] === "project id" && norm.some(c => c === "project name") && norm.some(c => c === "client");
  });
  if (!isIpc) return [];
  return rows.map(rowToInvoice).filter(Boolean);
}

// --- Fetch from Supabase ---

async function fetchSupabaseInvoices() {
  const all = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .range(from, from + batchSize - 1);
    if (error) throw new Error(`Supabase invoices error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

async function fetchSupabaseCollections() {
  const { data, error } = await supabase
    .from("collection_transactions")
    .select("*")
    .order("collection_month", { ascending: true });
  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      console.log("⚠️  collection_transactions table not found — migration needed");
      return [];
    }
    throw new Error(`Supabase collections error: ${error.message}`);
  }
  return data || [];
}

// --- Comparison logic ---

function compareNumbers(sheetVal, dbVal, tolerance = 0.01) {
  const a = Number(sheetVal) || 0;
  const b = Number(dbVal) || 0;
  return Math.abs(a - b) <= tolerance;
}

function buildInvoiceKey(projectCode, invoiceNumber) {
  return `${(projectCode||"").trim()}::${(invoiceNumber||"").trim()}`;
}

// --- Source data quality checks ---

function analyzeSourceDataIssues(sheetInvoices, monthKey, monthLabel) {
  const issues = [];

  for (const inv of sheetInvoices) {
    const loc = `${monthLabel} | ${inv.project_code} | IPC ${inv.invoice_number || "N/A"}`;

    // Missing critical fields
    if (!inv.project_name) issues.push({ severity: "high", loc, issue: "Missing project_name" });
    if (!inv.client) issues.push({ severity: "high", loc, issue: "Missing client name" });
    if (inv.contract_value <= 0) issues.push({ severity: "medium", loc, issue: `Contract value is ${inv.contract_value} (zero or negative)` });

    // Work total consistency
    const expectedWorkTotal = inv.work_previous + inv.work_current;
    if (!compareNumbers(expectedWorkTotal, inv.work_total, 1)) {
      issues.push({ severity: "high", loc, issue: `Work total mismatch: previous(${inv.work_previous}) + current(${inv.work_current}) = ${expectedWorkTotal} ≠ sheet total(${inv.work_total})` });
    }

    // Approved total consistency
    const expectedApprovedTotal = inv.approved_previous + inv.approved_current;
    if (!compareNumbers(expectedApprovedTotal, inv.approved_total, 1)) {
      issues.push({ severity: "medium", loc, issue: `Approved total mismatch: prev(${inv.approved_previous}) + current(${inv.approved_current}) = ${expectedApprovedTotal} ≠ sheet(${inv.approved_total})` });
    }

    // Approved net total consistency
    const expectedApprovedNetTotal = inv.approved_net_previous + inv.approved_net_current;
    if (!compareNumbers(expectedApprovedNetTotal, inv.approved_net_total, 1)) {
      issues.push({ severity: "medium", loc, issue: `Approved net total mismatch: prev(${inv.approved_net_previous}) + current(${inv.approved_net_current}) = ${expectedApprovedNetTotal} ≠ sheet(${inv.approved_net_total})` });
    }

    // Submitted > Contract value
    if (inv.work_total > inv.contract_value * 1.1 && inv.contract_value > 0) {
      issues.push({ severity: "warning", loc, issue: `Submitted(${inv.work_total}) exceeds contract(${inv.contract_value}) by ${((inv.work_total/inv.contract_value-1)*100).toFixed(1)}%` });
    }

    // Negative amounts
    if (inv.work_current < 0) issues.push({ severity: "warning", loc, issue: `Negative work_current: ${inv.work_current}` });
    if (inv.approved_current < 0) issues.push({ severity: "warning", loc, issue: `Negative approved_current: ${inv.approved_current}` });
    if (inv.collection_current < 0) issues.push({ severity: "high", loc, issue: `Negative collection_current: ${inv.collection_current}` });

    // Collection > Approved
    if (inv.total_collections > 0 && inv.approved_net_total > 0 && inv.total_collections > inv.approved_net_total * 1.05) {
      issues.push({ severity: "warning", loc, issue: `Over-collection: collected(${inv.total_collections}) > approved_net(${inv.approved_net_total})` });
    }

    // Approved without submitted
    if (inv.approved_total > 0 && inv.work_total <= 0) {
      issues.push({ severity: "high", loc, issue: `Approved(${inv.approved_total}) but no submitted work (work_total=0)` });
    }

    // Missing invoice number
    if (!inv.invoice_number) {
      issues.push({ severity: "low", loc, issue: "Missing invoice_number — will use fallback key" });
    }

    // Bad date
    if (inv.submitted_date === null && inv.status !== "draft") {
      issues.push({ severity: "low", loc, issue: `Status is '${inv.status}' but submitted_date is null` });
    }

    // Deductions sanity
    if (inv.total_deductions < 0) {
      issues.push({ severity: "warning", loc, issue: `Negative deductions: ${inv.total_deductions}` });
    }

    // Net vs Gross check
    const expectedNet = inv.work_total - inv.total_deductions;
    if (inv.net_total > 0 && !compareNumbers(expectedNet, inv.net_total, 100)) {
      issues.push({ severity: "low", loc, issue: `Net total(${inv.net_total}) ≠ work_total(${inv.work_total}) - deductions(${inv.total_deductions}) = ${expectedNet}` });
    }
  }

  // Cross-row checks within same month
  const projectMap = new Map();
  for (const inv of sheetInvoices) {
    if (!projectMap.has(inv.project_code)) projectMap.set(inv.project_code, []);
    projectMap.get(inv.project_code).push(inv);
  }

  for (const [code, invs] of projectMap) {
    // Duplicate invoice numbers
    const invoiceNums = invs.filter(i => i.invoice_number).map(i => i.invoice_number);
    const dupes = invoiceNums.filter((n, i) => invoiceNums.indexOf(n) !== i);
    if (dupes.length > 0) {
      issues.push({ severity: "high", loc: `${monthLabel} | ${code}`, issue: `Duplicate invoice numbers in same month: ${[...new Set(dupes)].join(", ")}` });
    }

    // Inconsistent contract values
    const cvs = [...new Set(invs.map(i => i.contract_value))];
    if (cvs.length > 1) {
      issues.push({ severity: "medium", loc: `${monthLabel} | ${code}`, issue: `Inconsistent contract values across IPCs: ${cvs.join(", ")}` });
    }

    // Inconsistent client names
    const clients = [...new Set(invs.map(i => i.client).filter(Boolean))];
    if (clients.length > 1) {
      issues.push({ severity: "low", loc: `${monthLabel} | ${code}`, issue: `Multiple client names: ${clients.join(" | ")}` });
    }
  }

  return issues;
}

// --- Main audit ---

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PZone IPC V2 — Google Sheet ↔ Supabase Data Integrity Audit");
  console.log("  " + new Date().toISOString());
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Fetch all sheet data
  console.log("📊 Fetching Google Sheet data for 6 months...\n");
  const allSheetInvoices = [];
  const sheetByMonth = {};

  for (const config of MONTH_CONFIGS) {
    try {
      const invoices = await fetchMonthInvoices(config);
      sheetByMonth[config.key] = invoices;
      allSheetInvoices.push(...invoices.map(inv => ({ ...inv, _month: config.key, _monthLabel: config.label })));
      console.log(`  ✅ ${config.label}: ${invoices.length} rows`);
    } catch (err) {
      console.log(`  ❌ ${config.label}: ${err.message}`);
      sheetByMonth[config.key] = [];
    }
  }

  const totalSheetRows = allSheetInvoices.length;
  console.log(`\n  Total sheet rows: ${totalSheetRows}\n`);

  // 2. Fetch Supabase data
  console.log("🗄️  Fetching Supabase data...\n");
  const dbInvoices = await fetchSupabaseInvoices();
  const dbCollections = await fetchSupabaseCollections();
  console.log(`  Invoices in DB: ${dbInvoices.length}`);
  console.log(`  Collections in DB: ${dbCollections.length}\n`);

  // 3. Build lookup maps
  const dbByKey = new Map();
  for (const row of dbInvoices) {
    const key = buildInvoiceKey(row.project_code, row.invoice_number);
    if (!dbByKey.has(key)) dbByKey.set(key, row);
  }

  // 4. Compare: Sheet → DB
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SECTION 1: SYNC VERIFICATION (Sheet → Supabase)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const missing = [];
  const mismatches = [];
  const matched = [];
  const sheetKeysSet = new Set();

  // Use latest month for each project_code + invoice_number
  const latestByKey = new Map();
  for (const inv of allSheetInvoices) {
    const key = buildInvoiceKey(inv.project_code, inv.invoice_number);
    const existing = latestByKey.get(key);
    if (!existing || inv._month > existing._month) {
      latestByKey.set(key, inv);
    }
  }

  for (const [key, inv] of latestByKey) {
    sheetKeysSet.add(key);
    const dbRow = dbByKey.get(key);

    if (!dbRow) {
      missing.push({ key, month: inv._monthLabel, project_code: inv.project_code, invoice_number: inv.invoice_number });
      continue;
    }

    // Compare key financial fields
    const fields = [
      ["contract_value", inv.contract_value, dbRow.contract_value],
      ["work_current", inv.work_current, dbRow.work_current],
      ["work_total", inv.work_total, dbRow.work_total],
      ["approved_total", inv.approved_total, dbRow.approved_total],
      ["approved_net_total", inv.approved_net_total, dbRow.approved_net_total],
      ["total_deductions", inv.total_deductions, dbRow.total_deductions],
    ];

    const diffs = [];
    for (const [field, sheetVal, dbVal] of fields) {
      if (!compareNumbers(sheetVal, dbVal, 0.5)) {
        diffs.push({ field, sheet: sheetVal, db: Number(dbVal) || 0 });
      }
    }

    if (diffs.length > 0) {
      mismatches.push({ key, month: inv._monthLabel, project_code: inv.project_code, diffs });
    } else {
      matched.push(key);
    }
  }

  // Orphans: in DB but not in any sheet
  const orphans = [];
  for (const [key, row] of dbByKey) {
    if (!sheetKeysSet.has(key)) {
      orphans.push({ key, project_code: row.project_code, invoice_number: row.invoice_number });
    }
  }

  console.log(`  ✅ Matched (Sheet = DB): ${matched.length}`);
  console.log(`  ❌ Missing from DB:      ${missing.length}`);
  console.log(`  ⚠️  Value mismatches:     ${mismatches.length}`);
  console.log(`  🔍 Orphans in DB only:   ${orphans.length}\n`);

  if (missing.length > 0) {
    console.log("  ── Missing from Supabase (need sync) ──");
    for (const m of missing.slice(0, 30)) {
      console.log(`    ${m.month} | ${m.project_code} | IPC ${m.invoice_number || "N/A"}`);
    }
    if (missing.length > 30) console.log(`    ... and ${missing.length - 30} more`);
    console.log();
  }

  if (mismatches.length > 0) {
    console.log("  ── Value Mismatches (Sheet ≠ DB) ──");
    for (const m of mismatches.slice(0, 30)) {
      const diffStr = m.diffs.map(d => `${d.field}: sheet=${d.sheet} db=${d.db}`).join(", ");
      console.log(`    ${m.month} | ${m.project_code}: ${diffStr}`);
    }
    if (mismatches.length > 30) console.log(`    ... and ${mismatches.length - 30} more`);
    console.log();
  }

  if (orphans.length > 0) {
    console.log("  ── Orphans (in DB but not in Sheet) ──");
    for (const o of orphans.slice(0, 20)) {
      console.log(`    ${o.project_code} | IPC ${o.invoice_number || "N/A"}`);
    }
    if (orphans.length > 20) console.log(`    ... and ${orphans.length - 20} more`);
    console.log();
  }

  // 5. Collection sync verification
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SECTION 2: COLLECTION SYNC VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Group sheet collections by month
  const sheetCollectionsByMonth = {};
  for (const inv of allSheetInvoices) {
    if (inv.collection_current > 0) {
      if (!sheetCollectionsByMonth[inv._month]) sheetCollectionsByMonth[inv._month] = [];
      sheetCollectionsByMonth[inv._month].push(inv);
    }
  }

  // Group DB collections by month
  const dbCollectionsByMonth = {};
  for (const c of dbCollections) {
    const month = c.collection_month?.slice(0, 7);
    if (month) {
      if (!dbCollectionsByMonth[month]) dbCollectionsByMonth[month] = [];
      dbCollectionsByMonth[month].push(c);
    }
  }

  let totalSheetCollAmount = 0;
  let totalDbCollAmount = 0;

  for (const config of MONTH_CONFIGS) {
    const sheetRows = sheetCollectionsByMonth[config.key] || [];
    const dbRows = dbCollectionsByMonth[config.key] || [];

    const sheetTotal = sheetRows.reduce((s, i) => s + i.collection_current, 0);
    const dbTotal = dbRows.reduce((s, c) => s + Number(c.amount || 0), 0);
    totalSheetCollAmount += sheetTotal;
    totalDbCollAmount += dbTotal;

    const match = compareNumbers(sheetTotal, dbTotal, 1) ? "✅" : "❌";
    console.log(`  ${match} ${config.label}: Sheet ${sheetRows.length} rows (${sheetTotal.toLocaleString()}) | DB ${dbRows.length} rows (${dbTotal.toLocaleString()})`);

    if (!compareNumbers(sheetTotal, dbTotal, 1)) {
      const diff = sheetTotal - dbTotal;
      console.log(`     → Difference: ${diff > 0 ? "+" : ""}${diff.toLocaleString()} (${diff > 0 ? "DB missing" : "DB has extra"})`);

      // Find which projects differ
      const sheetByProject = {};
      for (const r of sheetRows) {
        sheetByProject[r.project_code] = (sheetByProject[r.project_code] || 0) + r.collection_current;
      }
      const dbByProject = {};
      for (const r of dbRows) {
        dbByProject[r.project_code] = (dbByProject[r.project_code] || 0) + Number(r.amount || 0);
      }

      const allProjects = new Set([...Object.keys(sheetByProject), ...Object.keys(dbByProject)]);
      for (const p of allProjects) {
        const sv = sheetByProject[p] || 0;
        const dv = dbByProject[p] || 0;
        if (!compareNumbers(sv, dv, 1)) {
          console.log(`     → ${p}: sheet=${sv.toLocaleString()} db=${dv.toLocaleString()} diff=${(sv-dv).toLocaleString()}`);
        }
      }
    }
  }

  console.log(`\n  Total Collection Amount: Sheet=${totalSheetCollAmount.toLocaleString()} | DB=${totalDbCollAmount.toLocaleString()}`);
  if (!compareNumbers(totalSheetCollAmount, totalDbCollAmount, 1)) {
    console.log(`  ❌ TOTAL MISMATCH: ${(totalSheetCollAmount - totalDbCollAmount).toLocaleString()}`);
  } else {
    console.log(`  ✅ TOTALS MATCH`);
  }

  // 6. Source data quality
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  SECTION 3: SOURCE DATA QUALITY ISSUES");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const allIssues = [];
  for (const config of MONTH_CONFIGS) {
    const issues = analyzeSourceDataIssues(sheetByMonth[config.key], config.key, config.label);
    allIssues.push(...issues);
  }

  // Cross-month checks
  const projectMonthMap = new Map();
  for (const inv of allSheetInvoices) {
    const key = inv.project_code;
    if (!projectMonthMap.has(key)) projectMonthMap.set(key, []);
    projectMonthMap.get(key).push(inv);
  }

  for (const [code, invs] of projectMonthMap) {
    // Contract value changed across months
    const cvs = [...new Set(invs.map(i => i.contract_value).filter(v => v > 0))];
    if (cvs.length > 1) {
      allIssues.push({ severity: "medium", loc: `Cross-month | ${code}`, issue: `Contract value changed across months: ${cvs.map(v => v.toLocaleString()).join(" → ")}` });
    }

    // Work total should be non-decreasing across months
    const sorted = invs.sort((a,b) => a._month.localeCompare(b._month));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].work_total < sorted[i-1].work_total - 1 && sorted[i].work_total > 0) {
        allIssues.push({
          severity: "warning",
          loc: `${sorted[i]._monthLabel} | ${code}`,
          issue: `Cumulative work_total decreased: ${sorted[i-1].work_total.toLocaleString()} → ${sorted[i].work_total.toLocaleString()} (was higher in ${sorted[i-1]._monthLabel})`
        });
      }
    }
  }

  const bySeverity = { high: [], medium: [], warning: [], low: [] };
  for (const issue of allIssues) {
    (bySeverity[issue.severity] || bySeverity.low).push(issue);
  }

  const severityEmoji = { high: "🔴", medium: "🟡", warning: "🟠", low: "🔵" };

  for (const sev of ["high", "medium", "warning", "low"]) {
    const items = bySeverity[sev];
    if (items.length === 0) continue;
    console.log(`  ${severityEmoji[sev]} ${sev.toUpperCase()} (${items.length}):`);
    for (const item of items.slice(0, 25)) {
      console.log(`    ${item.loc}: ${item.issue}`);
    }
    if (items.length > 25) console.log(`    ... and ${items.length - 25} more`);
    console.log();
  }

  if (allIssues.length === 0) {
    console.log("  ✅ No source data quality issues found.\n");
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`  Sheet rows (across 6 months):     ${totalSheetRows}`);
  console.log(`  Unique invoice keys:               ${latestByKey.size}`);
  console.log(`  DB invoices:                       ${dbInvoices.length}`);
  console.log(`  DB collections:                    ${dbCollections.length}`);
  console.log(`  Sync match:                        ${matched.length}/${latestByKey.size} (${(matched.length/latestByKey.size*100).toFixed(1)}%)`);
  console.log(`  Missing from DB:                   ${missing.length}`);
  console.log(`  Value mismatches:                  ${mismatches.length}`);
  console.log(`  Orphans in DB:                     ${orphans.length}`);
  console.log(`  Collection total match:            ${compareNumbers(totalSheetCollAmount, totalDbCollAmount, 1) ? "✅ YES" : "❌ NO"}`);
  console.log(`  Source data issues:                ${allIssues.length} (🔴${bySeverity.high.length} 🟡${bySeverity.medium.length} 🟠${bySeverity.warning.length} 🔵${bySeverity.low.length})`);
  console.log();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
