import type { ProjectFinancialSummary, CollectionTransaction } from "@/hooks/useFinancialSnapshot";

export type CollectionImportSeverity = "error" | "warning";

export interface CollectionImportRow {
  project_code: string;
  project_name?: string | null;
  client?: string | null;
  invoice_number?: string | null;
  collection_date?: string | null;
  collection_month?: string | null;
  amount: number;
  currency?: string | null;
  reference_no?: string | null;
  bank_account?: string | null;
  source_row_key?: string | null;
  notes?: string | null;
}

export interface CollectionImportIssue {
  rowIndex: number;
  severity: CollectionImportSeverity;
  code:
    | "missing_project_code"
    | "unknown_project"
    | "missing_date"
    | "invalid_date"
    | "invalid_amount"
    | "missing_reference"
    | "duplicate"
    | "possible_duplicate"
    | "currency_mismatch"
    | "over_collection";
  message: string;
}

export interface CollectionImportPreviewRow extends CollectionImportRow {
  rowIndex: number;
  normalized_project_code: string;
  normalized_currency: string;
  normalized_collection_date: string | null;
  normalized_collection_month: string | null;
  dedupe_key: string;
  issues: CollectionImportIssue[];
}

export interface CollectionImportPreview {
  rows: CollectionImportPreviewRow[];
  issues: CollectionImportIssue[];
  validRows: CollectionImportPreviewRow[];
  blockedRows: CollectionImportPreviewRow[];
  totals: {
    amount: number;
    validAmount: number;
    errorCount: number;
    warningCount: number;
    validCount: number;
    blockedCount: number;
  };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeProjectCode(value: unknown) {
  return clean(value).toUpperCase();
}

function normalizeCurrency(value: unknown) {
  return clean(value || "EGP").toUpperCase();
}

function toDateOnly(value: string | null | undefined) {
  const text = clean(value);
  if (!text || text === "-") return null;
  const normalized = text.includes("/") ? text.split("/").reverse().join("-") : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string | null | undefined) {
  const date = toDateOnly(value);
  return date ? `${date.slice(0, 7)}-01` : null;
}

function moneyKey(amount: number) {
  return Number(amount || 0).toFixed(2);
}

export function buildCollectionDedupeKey(row: {
  project_code: string;
  invoice_number?: string | null;
  collection_date?: string | null;
  collection_month?: string | null;
  amount: number;
  reference_no?: string | null;
  source_row_key?: string | null;
}) {
  const project = normalizeProjectCode(row.project_code);
  const invoice = clean(row.invoice_number || "NO-INVOICE").toUpperCase();
  const date = toDateOnly(row.collection_date) || monthStart(row.collection_month) || "NO-DATE";
  const reference = clean(row.reference_no || row.source_row_key || "NO-REF").toUpperCase();
  return [project, invoice, date, moneyKey(row.amount), reference].join(":");
}

function pushIssue(
  issues: CollectionImportIssue[],
  rowIndex: number,
  severity: CollectionImportSeverity,
  code: CollectionImportIssue["code"],
  message: string,
) {
  issues.push({ rowIndex, severity, code, message });
}

export function validateCollectionImportRows(params: {
  rows: CollectionImportRow[];
  projects: ProjectFinancialSummary[];
  existingCollections?: CollectionTransaction[];
}) {
  const projectsByCode = new Map(params.projects.map((p) => [normalizeProjectCode(p.project_code), p]));
  const existingKeys = new Set((params.existingCollections || []).map((c) => c.dedupe_key));
  const seenKeys = new Set<string>();
  const existingSimilar = new Set(
    (params.existingCollections || []).map((c) =>
      [normalizeProjectCode(c.project_code), c.invoice_number || "NO-INVOICE", c.collection_month, moneyKey(c.amount)].join(":"),
    ),
  );

  const previewRows = params.rows.map((input, index) => {
    const rowIndex = index + 1;
    const issues: CollectionImportIssue[] = [];
    const normalized_project_code = normalizeProjectCode(input.project_code);
    const normalized_currency = normalizeCurrency(input.currency);
    const normalized_collection_date = toDateOnly(input.collection_date);
    const normalized_collection_month = monthStart(input.collection_month || input.collection_date);
    const dedupe_key = buildCollectionDedupeKey(input);
    const project = projectsByCode.get(normalized_project_code);

    if (!normalized_project_code) {
      pushIssue(issues, rowIndex, "error", "missing_project_code", "Project code is required.");
    } else if (!project) {
      pushIssue(issues, rowIndex, "error", "unknown_project", `Unknown project code: ${normalized_project_code}.`);
    }

    if (!clean(input.collection_date) && !clean(input.collection_month)) {
      pushIssue(issues, rowIndex, "error", "missing_date", "Collection date or month is required.");
    } else if (!normalized_collection_date && !normalized_collection_month) {
      pushIssue(issues, rowIndex, "error", "invalid_date", "Collection date/month is invalid.");
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      pushIssue(issues, rowIndex, "error", "invalid_amount", "Amount must be greater than zero.");
    }

    if (!clean(input.reference_no)) {
      pushIssue(issues, rowIndex, "warning", "missing_reference", "Reference number is missing; dedupe will rely on source row.");
    }

    if (project && normalized_currency !== project.currency.toUpperCase()) {
      pushIssue(
        issues,
        rowIndex,
        "error",
        "currency_mismatch",
        `Currency ${normalized_currency} does not match project currency ${project.currency}.`,
      );
    }

    if (existingKeys.has(dedupe_key) || seenKeys.has(dedupe_key)) {
      pushIssue(issues, rowIndex, "error", "duplicate", "Exact duplicate collection row.");
    }

    const similarKey = [
      normalized_project_code,
      clean(input.invoice_number || "NO-INVOICE"),
      normalized_collection_month,
      moneyKey(input.amount),
    ].join(":");
    if (existingSimilar.has(similarKey) && !existingKeys.has(dedupe_key)) {
      pushIssue(issues, rowIndex, "warning", "possible_duplicate", "Similar posted collection already exists.");
    }

    if (project && input.amount > project.outstanding && project.outstanding >= 0) {
      pushIssue(
        issues,
        rowIndex,
        "warning",
        "over_collection",
        `Collection exceeds current outstanding by ${moneyKey(input.amount - project.outstanding)}.`,
      );
    }

    seenKeys.add(dedupe_key);

    return {
      ...input,
      rowIndex,
      normalized_project_code,
      normalized_currency,
      normalized_collection_date,
      normalized_collection_month,
      dedupe_key,
      issues,
    };
  });

  const issues = previewRows.flatMap((r) => r.issues);
  const blockedRows = previewRows.filter((r) => r.issues.some((issue) => issue.severity === "error"));
  const validRows = previewRows.filter((r) => !r.issues.some((issue) => issue.severity === "error"));

  return {
    rows: previewRows,
    issues,
    validRows,
    blockedRows,
    totals: {
      amount: previewRows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0),
      validAmount: validRows.reduce((sum, r) => sum + r.amount, 0),
      errorCount: issues.filter((issue) => issue.severity === "error").length,
      warningCount: issues.filter((issue) => issue.severity === "warning").length,
      validCount: validRows.length,
      blockedCount: blockedRows.length,
    },
  } satisfies CollectionImportPreview;
}

export function toCollectionTransactionInsert(row: CollectionImportPreviewRow) {
  return {
    project_code: row.normalized_project_code,
    project_name: row.project_name || null,
    invoice_number: row.invoice_number || null,
    client: row.client || null,
    collection_date: row.normalized_collection_date || row.normalized_collection_month,
    collection_month: row.normalized_collection_month,
    amount: row.amount,
    currency: row.normalized_currency,
    reference_no: row.reference_no || null,
    bank_account: row.bank_account || null,
    notes: row.notes || null,
    source_type: "import",
    source_row_key: row.source_row_key || `row:${row.rowIndex}`,
    dedupe_key: row.dedupe_key,
    status: "validated",
  };
}
