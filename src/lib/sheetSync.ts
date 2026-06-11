/**
 * Google Sheets -> Supabase sync for IPC invoices and monthly collections.
 *
 * The IPC register remains sourced from the monthly invoice tabs. Posted
 * collection transactions are generated from each tab's monthly collection
 * column so dashboards use a proper ledger instead of invoice-date totals.
 */

import { type SupabaseClient } from "@supabase/supabase-js";

const PUBLISHED_ID = "2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V";

/** In dev mode, route through Vite proxy to bypass CORS. */
const GSHEET_ORIGIN =
  import.meta.env.DEV
    ? "/gsheet-proxy"
    : "https://docs.google.com";

export interface SheetConfig {
  key: string;
  label: string;
  gid: string;
}

export const MONTH_CONFIGS: SheetConfig[] = [
  { key: "2026-01", label: "January 2026", gid: "710892751" },
  { key: "2026-02", label: "February 2026", gid: "436039118" },
  { key: "2026-03", label: "March 2026", gid: "393117100" },
  { key: "2026-04", label: "April 2026", gid: "801847961" },
  { key: "2026-05", label: "May 2026", gid: "381875970" },
  { key: "2026-06", label: "June 2026", gid: "331791800" },
];

export const MONTH_LABELS: Record<string, string> = Object.fromEntries(
  MONTH_CONFIGS.map((c) => [c.key, c.label]),
);

let activeSheetConfigs: SheetConfig[] = MONTH_CONFIGS;

function decodePublishedName(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function buildPubHtmlUrl(): string {
  return `${GSHEET_ORIGIN}/spreadsheets/d/e/${PUBLISHED_ID}/pubhtml`;
}

function getSheetLabel(monthKey: string, configs: SheetConfig[] = activeSheetConfigs): string {
  return configs.find((config) => config.key === monthKey)?.label || MONTH_LABELS[monthKey] || monthKey;
}

export async function discoverSheetConfigs(): Promise<SheetConfig[]> {
  const response = await fetch(buildPubHtmlUrl());
  if (!response.ok) {
    throw new Error(`Failed to discover sheet tabs: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const items = [...html.matchAll(/items\.push\(\{name: "((?:\\.|[^"])*)".*?gid: "(-?\d+)"/g)]
    .map((match) => ({
      label: decodePublishedName(match[1]).trim(),
      gid: match[2],
    }))
    .filter((item) => item.label && item.gid);

  if (items.length === 0) {
    throw new Error("Could not discover sheet tabs from the published Google Sheet.");
  }

  const staticGids = new Set(MONTH_CONFIGS.map((config) => config.gid));
  const lastStaticIndex = Math.max(...MONTH_CONFIGS.map((config) => items.findIndex((item) => item.gid === config.gid)));
  const dynamicExtras = lastStaticIndex >= 0
    ? items.slice(lastStaticIndex + 1).filter((item) => !staticGids.has(item.gid))
    : items.filter((item) => !staticGids.has(item.gid));

  activeSheetConfigs = [
    ...MONTH_CONFIGS,
    ...dynamicExtras.map((item) => ({
      key: `sheet-${item.gid}`,
      label: item.label,
      gid: item.gid,
    })),
  ];

  return activeSheetConfigs;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field.trim());
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else {
      field += ch;
    }
  }

  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some((v) => v !== "")) rows.push(row);
  }

  return rows;
}

function toNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[,\s%$]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned.toUpperCase() === "N/A") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toDate(value: string | undefined | null): string | null {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const raw = value.trim().replace(/-$/, "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const dmy = raw.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
  if (dmy) {
    const [, d, mon, y] = dmy;
    const months: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const m = months[mon.toLowerCase().slice(0, 3)];
    if (m) return `${y.length === 2 ? `20${y}` : y}-${m}-${d.padStart(2, "0")}`;
  }

  const slash = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

// Map Arabic status values to English DB-compatible values
const STATUS_MAP: Record<string, string> = {
  'معتمد': 'approved',
  'تحت الاعتماد': 'pending',
  'تحت الإعتماد': 'pending',
  'مرفوض': 'rejected',
  'في انتظار النسخة المعتمدة': 'pending',
  'لم يتم اعتماد السابق': 'draft',
};

function mapStatus(arabicStatus: string): string {
  if (!arabicStatus) return 'draft';
  return STATUS_MAP[arabicStatus.trim()] || 'draft';
}

export interface SheetInvoice {
  project_code: string;
  sector: string;
  submitted_date: string | null;
  project_name: string;
  client: string;
  contract_value: number;
  invoice_number: string | null;
  work_previous: number;
  work_current: number;
  work_total: number;
  total_deductions: number;
  net_previous: number;
  net_current: number;
  net_total: number;
  approved_previous: number;
  approved_current: number;
  approved_total: number;
  approved_deductions: number;
  approved_net_previous: number;
  approved_net_current: number;
  approved_net_total: number;
  status: string;
  approval_date: string | null;
  project_status: string;
  contract_percentage: number;
  collection_current: number;
  total_collections: number;
  expected_collection: number;
  invoice_type: string;
}

function rowToInvoice(cells: string[]): SheetInvoice | null {
  const projectCode = (cells[0] || "").trim();
  if (!projectCode) return null;
  if (!/^(PZ-|\d)/.test(projectCode)) return null;
  if (/^total|^الإجمالي|^اجمالي|^اجمالى/i.test(projectCode)) return null;
  if (!cells[3]?.trim() && !cells[4]?.trim()) return null;

  // Jan-Mar have 27 columns. Apr-Jun added project_status at index 23.
  const hasProjectStatusColumn = cells.length >= 28;
  const percentageIndex = hasProjectStatusColumn ? 24 : 23;
  const monthlyCollectionIndex = hasProjectStatusColumn ? 25 : 24;
  const totalCollectionIndex = hasProjectStatusColumn ? 26 : 25;
  const expectedCollectionIndex = hasProjectStatusColumn ? 27 : 26;

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
    project_status: hasProjectStatusColumn ? (cells[23] || "").trim() : "",
    contract_percentage: toNumber(cells[percentageIndex]),
    collection_current: toNumber(cells[monthlyCollectionIndex]),
    total_collections: toNumber(cells[totalCollectionIndex]),
    expected_collection: toNumber(cells[expectedCollectionIndex]),
    invoice_type: "submitted",
  };
}

function buildCsvUrl(gid: string): string {
  return `${GSHEET_ORIGIN}/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function isIpcSheet(rows: string[][]): boolean {
  return rows.some((row) => {
    const normalized = row.map((cell) => String(cell || "").trim().toLowerCase());
    return (
      normalized[0] === "project id" &&
      normalized.some((cell) => cell === "project name") &&
      normalized.some((cell) => cell === "client")
    );
  });
}

export async function fetchMonthData(
  monthKey: string,
  configs: SheetConfig[] = activeSheetConfigs,
  signal?: AbortSignal,
): Promise<SheetInvoice[]> {
  const config = configs.find((c) => c.key === monthKey) || MONTH_CONFIGS.find((c) => c.key === monthKey);
  if (!config) throw new Error(`Unknown month: ${monthKey}`);

  const response = await fetch(buildCsvUrl(config.gid), { signal });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Sheet is not published. Publish the Google Sheet to web or use an authenticated importer.");
    }
    throw new Error(`Failed to fetch ${config.label}: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  if (csvText.trim().startsWith("<!") || csvText.trim().startsWith("<html")) {
    throw new Error("Sheet CSV export returned HTML. Publish the sheet to web first.");
  }

  const rows = parseCSV(csvText);
  if (!isIpcSheet(rows)) return [];

  return rows.map(rowToInvoice).filter((invoice): invoice is SheetInvoice => Boolean(invoice));
}

export interface SyncResult {
  monthKey: string;
  label: string;
  total: number;
  inserted: number;
  updated: number;
  collectionsInserted: number;
  collectionsUpdated: number;
  errors: string[];
}

function monthStart(monthKey: string): string {
  return `${monthKey}-01`;
}

function monthEnd(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function fallbackInvoiceNumber(inv: SheetInvoice, monthKey: string): string {
  return inv.invoice_number || `${monthKey}-${inv.project_code}`;
}

function collectionDedupeKey(inv: SheetInvoice, monthKey: string): string {
  return [
    "pzone-invoices-2026",
    monthKey,
    inv.project_code,
    fallbackInvoiceNumber(inv, monthKey),
    monthEnd(monthKey),
    inv.collection_current.toFixed(2),
  ].join("::");
}

export async function syncMonthToSupabase(
  supabase: SupabaseClient,
  monthKey: string,
  invoices: SheetInvoice[],
  validColumns?: Set<string>,
  configs: SheetConfig[] = activeSheetConfigs,
  shouldAbort: () => boolean = () => false,
): Promise<SyncResult> {
  const label = getSheetLabel(monthKey, configs);
  const result: SyncResult = {
    monthKey,
    label,
    total: invoices.length,
    inserted: 0,
    updated: 0,
    collectionsInserted: 0,
    collectionsUpdated: 0,
    errors: [],
  };

  if (invoices.length === 0) return result;

  const assertNotAborted = () => {
    if (shouldAbort()) throw new Error("Sync aborted");
  };

  const filterRow = (inv: Record<string, unknown>) => {
    if (!validColumns) return inv;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inv)) {
      if (validColumns.has(key)) filtered[key] = value;
    }
    return filtered;
  };

  const projectCodes = [...new Set(invoices.map((i) => i.project_code))];
  assertNotAborted();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, project_code, invoice_number")
    .in("project_code", projectCodes);
  assertNotAborted();

  const existingMap = new Map<string, string>();
  for (const row of existing || []) {
    const key = `${row.project_code}::${row.invoice_number || ""}`;
    if (!existingMap.has(key)) existingMap.set(key, row.id);
  }

  const invoiceIdByKey = new Map<string, string>();

  for (const inv of invoices) {
    assertNotAborted();
    const key = `${inv.project_code}::${inv.invoice_number || ""}`;
    const existingId = existingMap.get(key);
    const { collection_current: _collectionCurrent, project_status: _projectStatus, ...invoicePayload } = inv;
    const row = filterRow(invoicePayload);

    if (existingId) {
      const { error } = await supabase.from("invoices").update(row).eq("id", existingId);
      assertNotAborted();
      if (error) {
        result.errors.push(`Update ${inv.project_code}: ${error.message}`);
      } else {
        invoiceIdByKey.set(key, existingId);
        result.updated++;
      }
    } else {
      const { data, error } = await supabase.from("invoices").insert(row).select("id").single();
      assertNotAborted();
      if (error) {
        result.errors.push(`Insert ${inv.project_code}: ${error.message}`);
      } else {
        if (data?.id) invoiceIdByKey.set(key, data.id);
        result.inserted++;
      }
    }
  }

  const collectionRows = invoices
    .filter((inv) => inv.collection_current > 0)
    .map((inv) => {
      const invoiceNo = fallbackInvoiceNumber(inv, monthKey);
      const invoiceKey = `${inv.project_code}::${inv.invoice_number || ""}`;
      return {
        project_code: inv.project_code,
        project_name: inv.project_name,
        invoice_id: invoiceIdByKey.get(invoiceKey) || null,
        invoice_number: invoiceNo,
        client: inv.client,
        collection_date: monthEnd(monthKey),
        collection_month: monthStart(monthKey),
        amount: Number(inv.collection_current.toFixed(2)),
        currency: "EGP",
        reference_no: `${label} ${inv.project_code} ${invoiceNo}`,
        notes: `Imported from ${label} monthly collection column`,
        source_type: "import",
        source_file_name: "Pzone Invoices 2026 Google Sheet",
        source_row_key: `${label}!${inv.project_code}!${invoiceNo}`,
        dedupe_key: collectionDedupeKey(inv, monthKey),
        status: "posted",
      };
    });

  if (collectionRows.length === 0) return result;

  assertNotAborted();
  const { data: existingCollections, error: existingCollectionsError } = await supabase
    .from("collection_transactions")
    .select("id,dedupe_key")
    .in("dedupe_key", collectionRows.map((row) => row.dedupe_key));
  assertNotAborted();

  if (existingCollectionsError) {
    result.errors.push(
      `Collections ${label}: ${existingCollectionsError.message}. Run supabase/migrations/20260605_financial_ledgers.sql first.`,
    );
    return result;
  }

  const existingCollectionMap = new Map<string, string>();
  for (const row of existingCollections || []) {
    existingCollectionMap.set(row.dedupe_key, row.id);
  }

  for (const row of collectionRows) {
    assertNotAborted();
    const existingCollectionId = existingCollectionMap.get(row.dedupe_key);
    if (existingCollectionId) {
      const { error } = await supabase.from("collection_transactions").update(row).eq("id", existingCollectionId);
      assertNotAborted();
      if (error) {
        result.errors.push(`Collection update ${row.project_code}: ${error.message}`);
      } else {
        result.collectionsUpdated++;
      }
    } else {
      const { error } = await supabase.from("collection_transactions").insert(row);
      assertNotAborted();
      if (error) {
        result.errors.push(`Collection insert ${row.project_code}: ${error.message}`);
      } else {
        result.collectionsInserted++;
      }
    }
  }

  return result;
}

export function getAvailableMonths(): string[] {
  return activeSheetConfigs.map((c) => c.key);
}
