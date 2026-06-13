/**
 * Google Sheets -> Supabase sync for IPC invoices and monthly collections.
 *
 * The IPC register remains sourced from the monthly invoice tabs. Posted
 * collection transactions are generated from each tab's monthly collection
 * column so dashboards use a proper ledger instead of invoice-date totals.
 */

import { type SupabaseClient } from "@supabase/supabase-js";

const SPREADSHEET_ID = "1fRZO0vNpkwn6Dowv_6tXiof-3LXp0uE5NmhzUmmyOiY";
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
  sheetName?: string;
  periodKey?: string;
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

interface DiscoveredSheetItem {
  label: string;
  gid?: string;
  sheetName?: string;
}

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

function buildWorksheetFeedUrl(): string {
  return `https://spreadsheets.google.com/feeds/worksheets/${SPREADSHEET_ID}/public/basic?alt=json`;
}

function getSheetLabel(monthKey: string, configs: SheetConfig[] = activeSheetConfigs): string {
  return configs.find((config) => config.key === monthKey)?.label || MONTH_LABELS[monthKey] || monthKey;
}

function normalizeSheetLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifySheetKey(label: string): string {
  return label
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "sheet";
}

export function inferSheetPeriodMonth(label: string): string | undefined {
  const match = label.trim().match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/i);
  if (!match) return undefined;

  const monthMap: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  return `${match[2]}-${monthMap[match[1].toLowerCase()]}`;
}

function buildDynamicSheetConfig(item: DiscoveredSheetItem): SheetConfig {
  const periodKey = inferSheetPeriodMonth(item.label);
  const gidKey = item.gid && /^-?\d+$/.test(item.gid) ? item.gid : slugifySheetKey(item.label);
  return {
    key: periodKey || `sheet-${gidKey}`,
    label: item.label,
    gid: item.gid || `sheet:${slugifySheetKey(item.label)}`,
    sheetName: item.sheetName || item.label,
    periodKey,
  };
}

export function mergeDiscoveredSheetConfigs(items: DiscoveredSheetItem[]): SheetConfig[] {
  const normalizedStaticLabels = new Map(MONTH_CONFIGS.map((config) => [normalizeSheetLabel(config.label), config]));
  const staticByGid = new Map(MONTH_CONFIGS.map((config) => [config.gid, config]));
  const output: SheetConfig[] = [];
  const usedKeys = new Set<string>();

  for (const item of items) {
    const label = item.label.trim();
    if (!label) continue;

    const staticConfig = (item.gid && staticByGid.get(item.gid)) || normalizedStaticLabels.get(normalizeSheetLabel(label));
    const config = staticConfig
      ? {
          ...staticConfig,
          gid: item.gid || staticConfig.gid,
          sheetName: item.sheetName || label,
          periodKey: staticConfig.key,
        }
      : buildDynamicSheetConfig({ ...item, label });

    if (usedKeys.has(config.key)) continue;
    usedKeys.add(config.key);
    output.push(config);
  }

  for (const config of MONTH_CONFIGS) {
    if (!usedKeys.has(config.key)) {
      output.push({ ...config, periodKey: config.key });
      usedKeys.add(config.key);
    }
  }

  return output;
}

function parsePublishedSheetItems(html: string): DiscoveredSheetItem[] {
  return [...html.matchAll(/items\.push\(\{name: "((?:\\.|[^"])*)".*?gid: "(-?\d+)"/g)]
    .map((match) => ({
      label: decodePublishedName(match[1]).trim(),
      gid: match[2],
    }))
    .filter((item) => item.label && item.gid);
}

function parseWorksheetFeedItems(json: any): DiscoveredSheetItem[] {
  const entries = json?.feed?.entry;
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => {
      const label = String(entry?.title?.$t || "").trim();
      return label ? { label, sheetName: label } : null;
    })
    .filter((item): item is DiscoveredSheetItem => Boolean(item));
}

async function fetchPublishedSheetItems(): Promise<DiscoveredSheetItem[]> {
  const response = await fetch(buildPubHtmlUrl());
  if (!response.ok) {
    throw new Error(`Failed to discover sheet tabs: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parsePublishedSheetItems(html);
}

async function fetchWorksheetFeedItems(): Promise<DiscoveredSheetItem[]> {
  const response = await fetch(buildWorksheetFeedUrl());
  if (!response.ok) {
    throw new Error(`Failed to discover worksheet feed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return parseWorksheetFeedItems(json);
}

export async function discoverSheetConfigs(): Promise<SheetConfig[]> {
  const errors: string[] = [];
  const discoveredByKey = new Map<string, DiscoveredSheetItem>();

  for (const loader of [fetchPublishedSheetItems, fetchWorksheetFeedItems]) {
    try {
      for (const item of await loader()) {
        const key = item.gid || normalizeSheetLabel(item.label);
        if (!discoveredByKey.has(key)) discoveredByKey.set(key, item);
      }
    } catch (err: any) {
      errors.push(err?.message || "Unknown sheet discovery error");
    }
  }

  const items = [...discoveredByKey.values()];
  if (items.length === 0) {
    throw new Error(
      `Could not discover sheet tabs from Google Sheet. ${errors.length ? errors.join(" | ") : "No tabs returned."}`,
    );
  }

  activeSheetConfigs = mergeDiscoveredSheetConfigs(items);
  return activeSheetConfigs;
}

function parseCSV(text: string): string[][] {
  // Strip BOM (byte order mark) that Google Sheets sometimes prepends
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

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
  'معتمد جزئياً': 'partially_approved',
  'معتمد جزئيا': 'partially_approved',
  'تحت الاعتماد': 'pending',
  'تحت الإعتماد': 'pending',
  'قيد المراجعة': 'pending',
  'تم التقديم': 'submitted',
  'مقدم': 'submitted',
  'مرفوض': 'rejected',
  'في انتظار النسخة المعتمدة': 'pending',
  'لم يتم اعتماد السابق': 'draft',
  'مسودة': 'draft',
  'ملغى': 'cancelled',
  'ملغي': 'cancelled',
  'منتهي': 'completed',
};

function mapStatus(arabicStatus: string): string {
  if (!arabicStatus) return 'draft';
  const mapped = STATUS_MAP[arabicStatus.trim()];
  if (!mapped) {
    console.warn(`[SheetSync] Unmapped invoice status: "${arabicStatus.trim()}" — defaulting to 'draft'`);
  }
  return mapped || 'draft';
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
  currency: string;
}

/** Column layout detected from the header row */
export interface ColumnLayout {
  hasProjectStatus: boolean;
  percentageIndex: number;
  monthlyCollectionIndex: number;
  totalCollectionIndex: number;
  expectedCollectionIndex: number;
}

const LAYOUT_WITH_STATUS: ColumnLayout = {
  hasProjectStatus: true,
  percentageIndex: 24,
  monthlyCollectionIndex: 25,
  totalCollectionIndex: 26,
  expectedCollectionIndex: 27,
};

const LAYOUT_WITHOUT_STATUS: ColumnLayout = {
  hasProjectStatus: false,
  percentageIndex: 23,
  monthlyCollectionIndex: 24,
  totalCollectionIndex: 25,
  expectedCollectionIndex: 26,
};

/**
 * Detect column layout from the header row.
 * Apr-Jun sheets added a 'project_status' / 'حالة المشروع' column at index 23,
 * shifting collection columns right by 1.
 */
export function detectColumnLayout(headerRow: string[]): ColumnLayout {
  const normalized = headerRow.map((cell) => String(cell || "").trim().toLowerCase());
  // Look for a project_status header at index 23
  const statusHeader = normalized[23] || "";
  if (
    statusHeader === "project status" ||
    statusHeader === "حالة المشروع" ||
    statusHeader === "project_status" ||
    /^(status|حال)/.test(statusHeader)
  ) {
    return LAYOUT_WITH_STATUS;
  }
  // Fallback: if there are 28+ columns, assume the status column exists
  if (headerRow.length >= 28) return LAYOUT_WITH_STATUS;
  return LAYOUT_WITHOUT_STATUS;
}

function rowToInvoice(cells: string[], layout: ColumnLayout): SheetInvoice | null {
  const projectCode = (cells[0] || "").trim();
  if (!projectCode) return null;
  if (!/^(PZ-|\d)/.test(projectCode)) return null;
  if (/^total|^الإجمالي|^اجمالي|^اجمالى/i.test(projectCode)) return null;
  if (!cells[3]?.trim() && !cells[4]?.trim()) return null;

  // Detect USD from $ sign in the raw contract_value cell (column F)
  const rawContractValue = (cells[5] || "").trim();
  const currency = rawContractValue.includes("$") ? "USD" : "EGP";

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
    project_status: layout.hasProjectStatus ? (cells[23] || "").trim() : "",
    contract_percentage: toNumber(cells[layout.percentageIndex]),
    collection_current: toNumber(cells[layout.monthlyCollectionIndex]),
    total_collections: toNumber(cells[layout.totalCollectionIndex]),
    expected_collection: toNumber(cells[layout.expectedCollectionIndex]),
    invoice_type: "submitted",
    currency,
  };
}

function buildPublishedCsvUrl(gid: string): string {
  return `${GSHEET_ORIGIN}/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function buildGvizCsvUrl(config: SheetConfig): string {
  const selector = config.gid && /^-?\d+$/.test(config.gid)
    ? `gid=${encodeURIComponent(config.gid)}`
    : `sheet=${encodeURIComponent(config.sheetName || config.label)}`;
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&${selector}`;
}

async function fetchSheetCsv(config: SheetConfig, signal?: AbortSignal): Promise<string> {
  const FETCH_TIMEOUT_MS = 30_000; // 30 second timeout
  const urls = [
    config.gid && /^-?\d+$/.test(config.gid) ? buildPublishedCsvUrl(config.gid) : undefined,
    buildGvizCsvUrl(config),
  ].filter((url): url is string => Boolean(url));

  const errors: string[] = [];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
      const response = await fetch(url, { signal: combinedSignal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        errors.push(`${response.status} ${response.statusText}`);
        continue;
      }

      const csvText = await response.text();
      if (csvText.trim().startsWith("<!") || csvText.trim().startsWith("<html")) {
        errors.push("CSV export returned HTML");
        continue;
      }

      return csvText;
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      errors.push(err?.message || "CSV fetch failed");
    }
  }

  throw new Error(`Failed to fetch ${config.label}: ${errors.join(" | ")}`);
}

function findHeaderRow(rows: string[][]): { index: number; row: string[] } | null {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const normalized = rows[i].map((cell) => String(cell || "").trim().toLowerCase());
    if (
      normalized[0] === "project id" &&
      normalized.some((cell) => cell === "project name") &&
      normalized.some((cell) => cell === "client")
    ) {
      return { index: i, row: rows[i] };
    }
  }
  return null;
}

export async function fetchMonthData(
  monthKey: string,
  configs: SheetConfig[] = activeSheetConfigs,
  signal?: AbortSignal,
): Promise<SheetInvoice[]> {
  const config = configs.find((c) => c.key === monthKey) || MONTH_CONFIGS.find((c) => c.key === monthKey);
  if (!config) throw new Error(`Unknown month: ${monthKey}`);

  const csvText = await fetchSheetCsv(config, signal);

  const rows = parseCSV(csvText);
  const header = findHeaderRow(rows);
  if (!header) return [];

  const layout = detectColumnLayout(header.row);
  // Skip everything up to and including the header row
  const dataRows = rows.slice(header.index + 1);
  const allInvoices = dataRows.map((row) => rowToInvoice(row, layout)).filter((invoice): invoice is SheetInvoice => Boolean(invoice));

  // Keep only the latest IPC per project within this month tab.
  // If a project appears multiple times (e.g. IPC #3 and IPC #5),
  // only the row with the highest IPC number survives.
  return deduplicateByProject(allInvoices);
}

/**
 * Given multiple invoices for the same project, keep only the one with
 * the highest IPC sort value (latest invoice number).
 */
function deduplicateByProject(invoices: SheetInvoice[]): SheetInvoice[] {
  const best = new Map<string, SheetInvoice>();
  for (const inv of invoices) {
    const existing = best.get(inv.project_code);
    if (!existing) {
      best.set(inv.project_code, inv);
      continue;
    }
    const invSort = ipcSortValue(inv.invoice_number);
    const existingSort = ipcSortValue(existing.invoice_number);
    if (invSort > existingSort) {
      best.set(inv.project_code, inv);
    }
  }
  return Array.from(best.values());
}

/** Simple IPC sort: extract numeric value, boost finals. */
function ipcSortValue(invoiceNumber: string | null): number {
  const raw = String(invoiceNumber || "").trim();
  const match = raw.match(/\d+/);
  const base = match ? Number(match[0]) : 0;
  const finalBoost = /final|finale|ختام|نهائي/i.test(raw) ? 10000 : 0;
  return finalBoost + base;
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

function getSheetPeriodMonth(monthKey: string, config?: SheetConfig): string | undefined {
  if (/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  return config?.periodKey || inferSheetPeriodMonth(config?.label || "");
}

/** Normalize Arabic text for consistent matching (handles ى/ي variants, extra spaces) */
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // strip tashkeel/diacritics
    .replace(/ى/g, "ي")                     // normalize alef maqsura → yaa
    .replace(/إ|أ|آ/g, "ا")                  // normalize hamza variants → alef
    .replace(/ة/g, "ه")                      // normalize taa marbuta → haa
    .replace(/\s+/g, " ")                    // collapse whitespace
    .trim();
}

function collectionDedupeKey(inv: SheetInvoice, monthKey: string): string {
  // NOTE: amount is intentionally EXCLUDED from the key.
  // Including amount caused duplicates when collection values were corrected in the sheet.
  // Prefix with 'sheet::' to distinguish from manual imports (collection-import.ts).
  return [
    "sheet",
    "pzone-invoices-2026",
    monthKey,
    inv.project_code,
    normalizeArabic(fallbackInvoiceNumber(inv, monthKey)),
    monthEnd(monthKey),
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
  const config = configs.find((c) => c.key === monthKey);
  const collectionMonth = getSheetPeriodMonth(monthKey, config);
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
    .select("id, project_code, invoice_number, submitted_date")
    .in("project_code", projectCodes);
  assertNotAborted();

  // Bug 1 fix: include submitted_date in dedupe key so cross-month rows
  // with the same project_code + invoice_number are treated as distinct records.
  function invoiceDedupeKey(projectCode: string, invoiceNumber: string | null, submittedDate: string | null): string {
    return `${projectCode}::${normalizeArabic(invoiceNumber || "")}::${submittedDate || "no-date"}`;
  }

  const existingMap = new Map<string, string>();
  for (const row of existing || []) {
    const key = invoiceDedupeKey(row.project_code, row.invoice_number, row.submitted_date);
    if (!existingMap.has(key)) existingMap.set(key, row.id);
  }

  const invoiceIdByKey = new Map<string, string>();
  const syncedInvoiceIds = new Set<string>();

  for (const inv of invoices) {
    assertNotAborted();
    const key = invoiceDedupeKey(inv.project_code, inv.invoice_number, inv.submitted_date);
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
        syncedInvoiceIds.add(existingId);
        result.updated++;
      }
    } else {
      const { data, error } = await supabase.from("invoices").insert(row).select("id").single();
      assertNotAborted();
      if (error) {
        result.errors.push(`Insert ${inv.project_code}: ${error.message}`);
      } else {
        if (data?.id) {
          invoiceIdByKey.set(key, data.id);
          syncedInvoiceIds.add(data.id);
        }
        result.inserted++;
      }
    }
  }

  const rowsWithCollections = invoices.filter((inv) => inv.collection_current > 0);
  if (!collectionMonth && rowsWithCollections.length > 0) {
    result.errors.push(`Collections ${label}: sheet name must include a month and year before collection rows can be posted.`);
    return result;
  }

  const collectionRows = rowsWithCollections
    .filter((inv) => inv.collection_current > 0)
    .map((inv) => {
      const periodKey = collectionMonth || monthKey;
      const invoiceNo = fallbackInvoiceNumber(inv, periodKey);
      const invoiceKey = invoiceDedupeKey(inv.project_code, inv.invoice_number, inv.submitted_date);
      return {
        project_code: inv.project_code,
        project_name: inv.project_name,
        invoice_id: invoiceIdByKey.get(invoiceKey) || null,
        invoice_number: invoiceNo,
        client: inv.client,
        collection_date: monthEnd(periodKey),
        collection_month: monthStart(periodKey),
        amount: Number(inv.collection_current.toFixed(2)),
        currency: "EGP",
        reference_no: `${label} ${inv.project_code} ${invoiceNo}`,
        notes: `Imported from ${label} monthly collection column`,
        source_type: "import",
        source_file_name: "Pzone Invoices 2026 Google Sheet",
        source_row_key: `${label}!${inv.project_code}!${invoiceNo}`,
        dedupe_key: collectionDedupeKey(inv, periodKey),
        status: "posted",
      };
    });

  if (collectionRows.length === 0) return result;

  assertNotAborted();
  const { data: existingCollections, error: existingCollectionsError } = await supabase
    .from("collection_transactions")
    .select("id, project_code, collection_month, created_at")
    .in("project_code", collectionRows.map((row) => row.project_code))
    .in("collection_month", collectionRows.map((row) => row.collection_month));
  assertNotAborted();

  if (existingCollectionsError) {
    result.errors.push(
      `Collections ${label}: ${existingCollectionsError.message}. Run supabase/migrations/20260605_financial_ledgers.sql first.`,
    );
    return result;
  }

  const existingCollectionMap = new Map<string, any[]>();
  for (const row of existingCollections || []) {
    const key = `${row.project_code}::${row.collection_month}`;
    if (!existingCollectionMap.has(key)) existingCollectionMap.set(key, []);
    existingCollectionMap.get(key)!.push(row);
  }

  for (const row of collectionRows) {
    assertNotAborted();
    const key = `${row.project_code}::${row.collection_month}`;
    const existing = existingCollectionMap.get(key) || [];
    
    if (existing.length > 0) {
      // Sort to keep the newest one if multiple exist
      existing.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      
      // Delete any duplicates for this project/month FIRST to avoid unique constraint violations during update
      if (existing.length > 1) {
        for (let i = 1; i < existing.length; i++) {
          await supabase.from("collection_transactions").delete().eq("id", existing[i].id);
        }
      }

      const targetId = existing[0].id;
      const { error } = await supabase.from("collection_transactions").update(row).eq("id", targetId);
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
