import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import xlsxModule from "xlsx";

const XLSX = xlsxModule.default || xlsxModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_WORKBOOK = "C:/Users/0255/Downloads/Pzone Invoices 2026 (1).xlsx";
const workbookPath = process.argv[2] || DEFAULT_WORKBOOK;
const sqlOutputPath = process.env.PZONE_IMPORT_SQL_OUTPUT || null;

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://dwpdrclupradpnsminvi.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4";

const MONTH_SHEETS = [
  { name: "April 2026 ", month: "2026-04-01", collectionDate: "2026-04-30" },
  { name: "May 2026 ", month: "2026-05-01", collectionDate: "2026-05-31" },
  { name: "June 2026", month: "2026-06-01", collectionDate: "2026-06-30" },
];

const CP1252_REVERSE = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function value(v) {
  if (v === null || v === undefined || v === "" || v === "-") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/\$/g, "").replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function text(v) {
  const raw = String(v ?? "").replace(/\u00a0/g, " ").trim();
  if (!/[ØÙ]/.test(raw)) return raw;
  try {
    const bytes = Uint8Array.from(
      [...raw].map((char) => {
        const code = char.charCodeAt(0);
        return CP1252_REVERSE.get(code) ?? (code & 255);
      })
    );
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return raw;
  }
}

function isoDate(v) {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const raw = text(v);
  const normalized = raw.replace(/-$/, "");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function percentage(v) {
  if (typeof v === "number") return v > 1 ? v / 100 : v;
  const raw = text(v);
  if (!raw) return 0;
  const n = Number(raw.replace("%", "").trim());
  return Number.isFinite(n) ? n / 100 : 0;
}

function inferCurrency(contractValueRaw) {
  return text(contractValueRaw).includes("$") ? "USD" : "EGP";
}

function normalizeStatus(raw) {
  const s = text(raw);
  if (!s) return "تحت الاعتماد";
  return s;
}

function parseSheet(wb, sheetConfig) {
  const ws = wb.Sheets[sheetConfig.name];
  if (!ws) return [];

  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  return rows
    .slice(4)
    .filter((row) => /^PZ-/.test(text(row[0])))
    .map((row, index) => {
      const invoice = {
        project_code: text(row[0]),
        sector: text(row[1]) || null,
        submitted_date: isoDate(row[2]),
        project_name: text(row[3]) || text(row[0]),
        client: text(row[4]) || null,
        contract_value: value(row[5]),
        invoice_number: text(row[6]) || `${sheetConfig.month.slice(0, 7)}-${text(row[0])}`,
        work_previous: value(row[7]),
        work_current: value(row[8]),
        work_total: value(row[9]),
        total_deductions: value(row[10]),
        net_previous: value(row[11]),
        net_current: value(row[12]),
        net_total: value(row[13]),
        approved_previous: value(row[14]),
        approved_current: value(row[15]),
        approved_total: value(row[16]),
        approved_deductions: value(row[17]),
        approved_net_previous: value(row[18]),
        approved_net_current: value(row[19]),
        approved_net_total: value(row[20]),
        status: normalizeStatus(row[21]),
        approval_date: isoDate(row[22]),
        approval_notes: `Imported from ${sheetConfig.name.trim()} row ${index + 5}`,
        contract_percentage: percentage(row[24]),
        total_collections: value(row[26]) || value(row[25]),
        unbilled: Math.max(0, value(row[20]) - (value(row[26]) || value(row[25]))),
        expected_collection: value(row[27]),
        invoice_type: "submitted",
        deductions_breakdown: value(row[10]) > 0 ? [{ name: "Submitted deductions", amount: value(row[10]) }] : [],
        approved_deductions_breakdown: value(row[17]) > 0 ? [{ name: "Approved deductions", amount: value(row[17]) }] : [],
        variations: [],
        approved_variations: [],
        fluctuation_amount: 0,
        approved_fluctuation_amount: 0,
        contract_id: null,
        project_id: null,
      };

      return {
        invoice,
        source: {
          sheet: sheetConfig.name.trim(),
          row: index + 5,
          month: sheetConfig.month,
          collectionDate: sheetConfig.collectionDate,
          collectionCurrent: value(row[25]),
          collectionCumulative: value(row[26]),
          currency: inferCurrency(row[5]),
        },
      };
    });
}

function invoiceKey(row) {
  return [
    row.invoice.project_code,
    row.invoice.invoice_number || "",
    row.source.sheet,
    row.source.row,
  ].join("::");
}

function collectionDedupeKey(row) {
  return [
    "pzone-invoices-2026",
    row.source.sheet,
    row.source.row,
    row.invoice.project_code,
    row.invoice.invoice_number || "",
    row.source.collectionDate,
    row.source.collectionCurrent.toFixed(2),
  ].join("::");
}

function sqlValue(v) {
  if (v === null || v === undefined || v === "") return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "0";
  if (Array.isArray(v) || typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildSql(parsed, invoiceRows, collectionRows) {
  const lines = [
    "-- Generated by scripts/import-pzone-invoice-log.mjs",
    "-- Run in Supabase SQL Editor if API import is blocked by auth/RLS.",
    "begin;",
    "",
  ];

  for (let i = 0; i < invoiceRows.length; i += 1) {
    const row = invoiceRows[i];
    const key = invoiceKey(parsed[i]);
    const cols = Object.keys(row);
    const values = cols.map((col) => sqlValue(row[col]));
    const updateAssignments = cols
      .filter((col) => col !== "approval_notes")
      .map((col) => `${col} = ${sqlValue(row[col])}`)
      .join(", ");
    lines.push(
      `do $$ begin`,
      `  if exists (select 1 from public.invoices where approval_notes like ${sqlValue(`%import_key=${key}%`)}) then`,
      `    update public.invoices set ${updateAssignments}, updated_at = now() where approval_notes like ${sqlValue(`%import_key=${key}%`)};`,
      `  else`,
      `    insert into public.invoices (${cols.join(", ")}) values (${values.join(", ")});`,
      `  end if;`,
      `end $$;`,
      ""
    );
  }

  for (const row of collectionRows) {
    const cols = Object.keys(row);
    const values = cols.map((col) => sqlValue(row[col]));
    lines.push(
      `insert into public.collection_transactions (${cols.join(", ")}) values (${values.join(", ")})`,
      "on conflict (dedupe_key) do nothing;",
      ""
    );
  }

  lines.push("commit;", "");
  return lines.join("\n");
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const importEmail = process.env.PZONE_IMPORT_EMAIL;
  const importPassword = process.env.PZONE_IMPORT_PASSWORD;
  if (importEmail && importPassword) {
    const { error } = await supabase.auth.signInWithPassword({
      email: importEmail,
      password: importPassword,
    });
    if (error) throw new Error(`Import login failed: ${error.message}`);
  }

  const wb = XLSX.readFile(workbookPath, { cellDates: false });
  const parsed = MONTH_SHEETS.flatMap((sheet) => parseSheet(wb, sheet));

  const invoiceRows = parsed.map(({ invoice, source }) => ({
    ...invoice,
    approval_notes: `${invoice.approval_notes}; import_key=${invoiceKey({ invoice, source })}`,
  }));

  const collectionRows = parsed
    .filter((row) => row.source.collectionCurrent > 0)
    .map((row) => ({
      project_code: row.invoice.project_code,
      project_name: row.invoice.project_name,
      invoice_number: row.invoice.invoice_number,
      client: row.invoice.client,
      collection_date: row.source.collectionDate,
      collection_month: row.source.month,
      amount: row.source.collectionCurrent,
      currency: row.source.currency,
      reference_no: `${row.source.sheet} row ${row.source.row}`,
      notes: "Imported from Pzone Invoices 2026 workbook monthly collection column",
      source_type: "import",
      source_file_name: path.basename(workbookPath),
      source_row_key: `${row.source.sheet}!${row.source.row}`,
      dedupe_key: collectionDedupeKey(row),
      status: "posted",
    }));

  if (sqlOutputPath) {
    const sql = buildSql(parsed, invoiceRows, collectionRows);
    fs.mkdirSync(path.dirname(path.resolve(sqlOutputPath)), { recursive: true });
    fs.writeFileSync(sqlOutputPath, sql, "utf8");
    console.log(
      JSON.stringify(
        {
          mode: "sql-output",
          sqlOutputPath,
          invoiceRows: invoiceRows.length,
          collectionRows: collectionRows.length,
        },
        null,
        2
      )
    );
    return;
  }

  const { data: existing = [], error: existingError } = await supabase
    .from("invoices")
    .select("id, approval_notes");
  if (existingError) throw existingError;

  const existingKeys = new Map();
  for (const row of existing) {
    const match = text(row.approval_notes).match(/import_key=([^;]+)/);
    if (match) existingKeys.set(match[1], row.id);
  }

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < invoiceRows.length; i += 1) {
    const row = invoiceRows[i];
    const key = invoiceKey(parsed[i]);
    const existingId = existingKeys.get(key);
    if (existingId) {
      const { error } = await supabase.from("invoices").update(row).eq("id", existingId);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from("invoices").insert(row);
      if (error) throw error;
      inserted += 1;
    }
  }

  let collectionsInserted = 0;
  let collectionsSkipped = 0;
  for (const row of collectionRows) {
    const { error } = await supabase.from("collection_transactions").insert(row);
    if (error?.code === "23505") {
      collectionsSkipped += 1;
      continue;
    }
    if (error) throw error;
    collectionsInserted += 1;
  }

  const summary = parsed.reduce(
    (acc, row) => {
      acc.invoices += 1;
      acc.submitted_current += row.invoice.work_current || 0;
      acc.approved_current += row.invoice.approved_current || 0;
      acc.collection_current += row.source.collectionCurrent || 0;
      return acc;
    },
    { invoices: 0, submitted_current: 0, approved_current: 0, collection_current: 0 }
  );

  console.log(
    JSON.stringify(
      {
        workbook: workbookPath,
        parsedSheets: MONTH_SHEETS.map((s) => s.name.trim()),
        invoiceRows: parsed.length,
        inserted,
        updated,
        collectionsInserted,
        collectionsSkipped,
        summary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
