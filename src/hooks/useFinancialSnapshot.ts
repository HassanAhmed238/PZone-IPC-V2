import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices, type Invoice } from "./useIPC";

export type LedgerStatus = "draft" | "validated" | "posted" | "reversed";
export type CashFlowType = "in" | "out";

export interface CollectionTransaction {
  id: string;
  project_code: string;
  project_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  client: string | null;
  collection_date: string;
  collection_month: string;
  amount: number;
  currency: string;
  reference_no: string | null;
  bank_account: string | null;
  notes: string | null;
  source_type: string;
  source_file_name: string | null;
  source_row_key: string | null;
  dedupe_key: string;
  status: LedgerStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashFlowTransaction {
  id: string;
  transaction_date: string;
  transaction_month: string;
  project_code: string | null;
  project_name: string | null;
  type: CashFlowType;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  reference_no: string | null;
  counterparty: string | null;
  source_type: string;
  source_id: string | null;
  status: LedgerStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashFlowForecast {
  id: string;
  forecast_date: string;
  forecast_month: string;
  project_code: string | null;
  project_name: string | null;
  type: CashFlowType;
  category: string;
  amount: number;
  currency: string;
  probability_pct: number;
  description: string | null;
  reference_no: string | null;
  source_type: string;
  source_id: string | null;
  status: "draft" | "active" | "closed" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialSnapshotFilters {
  dateFrom?: string;
  dateTo?: string;
  projectCodes?: string[];
  clients?: string[];
  sectors?: string[];
  statuses?: string[];
  includeDraft?: boolean;
}

export interface ProjectFinancialSummary {
  project_code: string;
  project_name: string;
  client: string;
  sector: string;
  contract_value: number;
  submitted_total: number;
  submitted_current: number;
  approved_total: number;
  approved_current: number;
  approved_net: number;
  total_deductions: number;
  actual_collected: number;
  forecast_cash_in: number;
  actual_cash_out: number;
  forecast_cash_out: number;
  outstanding: number;
  over_collected_amount: number;
  collection_efficiency: number;
  expected_cash_in: number;
  ipc_count: number;
  latest_ipc_number: string;
  latest_ipc_sort: number;
  status: string;
  approval_date: string | null;
  currency: string;
  flags: string[];
}

export interface MonthlyFinancialSummary {
  month: string;
  monthKey: string;
  submitted: number;
  approved: number;
  actualCollected: number;
  forecastCashIn: number;
  actualCashOut: number;
  forecastCashOut: number;
  netActual: number;
  netForecast: number;
  cumulativeActual: number;
  cumulativeForecast: number;
}

export interface AgingBucket {
  label: string;
  labelAr: string;
  days: string;
  amount: number;
  count: number;
  projects: string[];
}

export interface FinancialRisk {
  severity: "critical" | "warning" | "info";
  code: string;
  project_code: string;
  project_name: string;
  message: string;
  value?: number;
}

export interface FinancialControlIssue {
  severity: "critical" | "high" | "medium" | "low" | "warning" | "info";
  code: string;
  title: string;
  detail: string;
  project_code?: string;
  value?: number;
  suggested_action?: string;
}

export interface FinancialReadiness {
  mode: "online-ledger" | "legacy-fallback" | "empty-ledger";
  score: number;
  blockingIssues: number;
  warningIssues: number;
  issueCount: number;
}

export interface PortfolioFinancialSummary {
  total_contract_value: number;
  total_submitted: number;
  total_approved: number;
  total_approved_net: number;
  total_collections: number;
  total_forecast_cash_in: number;
  total_cash_out: number;
  total_forecast_cash_out: number;
  total_outstanding: number;
  total_over_collected: number;
  net_actual_cash: number;
  net_forecast_cash: number;
  overall_collection_rate: number;
  project_count: number;
  active_project_count: number;
}

export interface FinancialSnapshot {
  projects: ProjectFinancialSummary[];
  portfolio: PortfolioFinancialSummary;
  monthly: MonthlyFinancialSummary[];
  monthlyTrend: MonthlyFinancialSummary[];
  aging: AgingBucket[];
  risks: FinancialRisk[];
  collections: CollectionTransaction[];
  cashFlowTransactions: CashFlowTransaction[];
  forecasts: CashFlowForecast[];
  controlIssues: FinancialControlIssue[];
  readiness: FinancialReadiness;
  sourceMode: "ledger" | "legacy";
}

const EMPTY_PORTFOLIO: PortfolioFinancialSummary = {
  total_contract_value: 0,
  total_submitted: 0,
  total_approved: 0,
  total_approved_net: 0,
  total_collections: 0,
  total_forecast_cash_in: 0,
  total_cash_out: 0,
  total_forecast_cash_out: 0,
  total_outstanding: 0,
  total_over_collected: 0,
  net_actual_cash: 0,
  net_forecast_cash: 0,
  overall_collection_rate: 0,
  project_count: 0,
  active_project_count: 0,
};

function monthKey(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(date: string | null | undefined) {
  const key = monthKey(date);
  return key ? `${key}-01` : null;
}

function monthLabel(key: string) {
  const d = new Date(`${key}-01T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function toNum(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function getIpcSortValue(invoiceNumber: string | null | undefined, fallbackDate?: string | null) {
  const raw = String(invoiceNumber || "").trim();
  const match = raw.match(/\d+/);
  const base = match ? Number(match[0]) : 0;
  const finalBoost = /final|finale|ختام|نهائي/i.test(raw) ? 10000 : 0;
  const dateBoost = fallbackDate ? new Date(fallbackDate).getTime() / 1e13 : 0;
  return finalBoost + base + dateBoost;
}

function isPosted(status?: string | null) {
  return status === "posted";
}

function isLegacyCollection(row: CollectionTransaction) {
  return row.source_type === "legacy_backfill" || String(row.id).startsWith("legacy-");
}

function pushControlIssue(
  issues: FinancialControlIssue[],
  issue: Omit<FinancialControlIssue, never>,
) {
  issues.push(issue);
}

function normalizeCollection(row: any): CollectionTransaction {
  return {
    id: String(row.id),
    project_code: String(row.project_code || ""),
    project_name: row.project_name ?? null,
    invoice_id: row.invoice_id ?? null,
    invoice_number: row.invoice_number ?? null,
    client: row.client ?? null,
    collection_date: row.collection_date,
    collection_month: row.collection_month || monthStart(row.collection_date) || row.collection_date,
    amount: toNum(row.amount),
    currency: row.currency || "EGP",
    reference_no: row.reference_no ?? null,
    bank_account: row.bank_account ?? null,
    notes: row.notes ?? null,
    source_type: row.source_type || "manual",
    source_file_name: row.source_file_name ?? null,
    source_row_key: row.source_row_key ?? null,
    dedupe_key: row.dedupe_key || `${row.project_code}:${row.invoice_number || ""}:${row.collection_date}:${row.amount}`,
    status: row.status || "posted",
    created_by: row.created_by ?? null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function buildLegacyCollections(invoices: Invoice[]): CollectionTransaction[] {
  return invoices
    .filter((inv) => toNum(inv.total_collections) > 0)
    .map((inv) => {
      const date = inv.collection_date || inv.approval_date || inv.submitted_date || inv.created_at;
      return normalizeCollection({
        id: `legacy-${inv.id}`,
        project_code: inv.project_code,
        project_name: inv.project_name,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        client: inv.client,
        collection_date: date,
        collection_month: monthStart(date),
        amount: inv.total_collections,
        currency: "EGP",
        reference_no: `LEGACY-${inv.project_code}-${inv.invoice_number || "NA"}`,
        source_type: "legacy_backfill",
        dedupe_key: `legacy:${inv.project_code}:${inv.invoice_number || "NA"}:${toNum(inv.total_collections)}`,
        status: "posted",
      });
    });
}

async function fetchCollectionTransactions(): Promise<CollectionTransaction[]> {
  const { data, error } = await (supabase as any)
    .from("collection_transactions")
    .select("*")
    .neq("status", "reversed")
    .order("collection_month", { ascending: true });
  if (error) {
    if (/does not exist|schema cache|Could not find/i.test(error.message || "")) return [];
    throw error;
  }
  return (data || []).map(normalizeCollection);
}

async function fetchCashFlowTransactions(): Promise<CashFlowTransaction[]> {
  const { data, error } = await (supabase as any)
    .from("cash_flow_transactions")
    .select("*")
    .neq("status", "reversed")
    .order("transaction_month", { ascending: true });
  if (error) {
    if (/does not exist|schema cache|Could not find/i.test(error.message || "")) return [];
    throw error;
  }
  return (data || []).map((row: any) => ({
    id: String(row.id),
    transaction_date: row.transaction_date,
    transaction_month: row.transaction_month || monthStart(row.transaction_date) || row.transaction_date,
    project_code: row.project_code ?? null,
    project_name: row.project_name ?? null,
    type: row.type,
    category: row.category || "other",
    amount: toNum(row.amount),
    currency: row.currency || "EGP",
    description: row.description ?? null,
    reference_no: row.reference_no ?? null,
    counterparty: row.counterparty ?? null,
    source_type: row.source_type || "manual",
    source_id: row.source_id ?? null,
    status: row.status || "posted",
    created_by: row.created_by ?? null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  }));
}

async function fetchCashFlowForecasts(): Promise<CashFlowForecast[]> {
  const { data, error } = await (supabase as any)
    .from("cash_flow_forecasts")
    .select("*")
    .in("status", ["active", "draft"])
    .order("forecast_month", { ascending: true });
  if (error) {
    if (/does not exist|schema cache|Could not find/i.test(error.message || "")) return [];
    throw error;
  }
  return (data || []).map((row: any) => ({
    id: String(row.id),
    forecast_date: row.forecast_date,
    forecast_month: row.forecast_month || monthStart(row.forecast_date) || row.forecast_date,
    project_code: row.project_code ?? null,
    project_name: row.project_name ?? null,
    type: row.type,
    category: row.category || "other",
    amount: toNum(row.amount),
    currency: row.currency || "EGP",
    probability_pct: toNum(row.probability_pct || 100),
    description: row.description ?? null,
    reference_no: row.reference_no ?? null,
    source_type: row.source_type || "manual",
    source_id: row.source_id ?? null,
    status: row.status || "active",
    created_by: row.created_by ?? null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  }));
}

function passesFilters(inv: Invoice, filters?: FinancialSnapshotFilters) {
  if (!filters) return true;
  if (filters.projectCodes?.length && !filters.projectCodes.includes(inv.project_code)) return false;
  if (filters.clients?.length && !filters.clients.includes(inv.client || "Unknown")) return false;
  if (filters.sectors?.length && !filters.sectors.includes(inv.sector || "Other")) return false;
  if (filters.statuses?.length && !filters.statuses.includes(inv.status)) return false;
  if (filters.dateFrom || filters.dateTo) {
    const raw = inv.submitted_date || inv.approval_date || inv.created_at;
    const key = monthKey(raw);
    if (!key) return false;
    if (filters.dateFrom && key < filters.dateFrom.slice(0, 7)) return false;
    if (filters.dateTo && key > filters.dateTo.slice(0, 7)) return false;
  }
  return true;
}

function passesMonthRange(key: string | null, filters?: FinancialSnapshotFilters) {
  if (!filters?.dateFrom && !filters?.dateTo) return true;
  if (!key) return false;
  if (filters.dateFrom && key < filters.dateFrom.slice(0, 7)) return false;
  if (filters.dateTo && key > filters.dateTo.slice(0, 7)) return false;
  return true;
}

function addMonth(map: Map<string, MonthlyFinancialSummary>, key: string) {
  if (!map.has(key)) {
    map.set(key, {
      month: monthLabel(key),
      monthKey: key,
      submitted: 0,
      approved: 0,
      actualCollected: 0,
      forecastCashIn: 0,
      actualCashOut: 0,
      forecastCashOut: 0,
      netActual: 0,
      netForecast: 0,
      cumulativeActual: 0,
      cumulativeForecast: 0,
    });
  }
  return map.get(key)!;
}

export function computeFinancialSnapshot({
  invoices,
  collections,
  cashFlowTransactions,
  forecasts,
  filters,
}: {
  invoices: Invoice[];
  collections: CollectionTransaction[];
  cashFlowTransactions: CashFlowTransaction[];
  forecasts: CashFlowForecast[];
  filters?: FinancialSnapshotFilters;
}): FinancialSnapshot {
  const filteredInvoices = invoices.filter((inv) => passesFilters(inv, filters));
  const now = Date.now();
  const latestByProject = new Map<string, Invoice>();
  const invoicesByProject = new Map<string, Invoice[]>();
  const controlIssues: FinancialControlIssue[] = [];

  for (const inv of filteredInvoices) {
    if (!invoicesByProject.has(inv.project_code)) invoicesByProject.set(inv.project_code, []);
    invoicesByProject.get(inv.project_code)!.push(inv);
    const existing = latestByProject.get(inv.project_code);
    const invSort = getIpcSortValue(inv.invoice_number, inv.submitted_date || inv.created_at);
    const existingSort = existing ? getIpcSortValue(existing.invoice_number, existing.submitted_date || existing.created_at) : -1;
    if (!existing || invSort > existingSort) latestByProject.set(inv.project_code, inv);
  }

  const projectCodes = new Set(filteredInvoices.map((inv) => inv.project_code));
  const postedCollections = collections.filter((c) =>
    projectCodes.has(c.project_code) &&
    isPosted(c.status) &&
    passesMonthRange(monthKey(c.collection_month || c.collection_date), filters)
  );
  const postedCash = cashFlowTransactions.filter((t) =>
    (!t.project_code || projectCodes.has(t.project_code)) &&
    passesMonthRange(monthKey(t.transaction_month || t.transaction_date), filters)
  );
  const activeForecasts = forecasts.filter((f) =>
    (!f.project_code || projectCodes.has(f.project_code)) &&
    passesMonthRange(monthKey(f.forecast_month || f.forecast_date), filters)
  );
  const projects: ProjectFinancialSummary[] = [];
  const risks: FinancialRisk[] = [];

  latestByProject.forEach((latest, code) => {
    const projectInvoices = invoicesByProject.get(code) || [];
    const actualCollected = postedCollections
      .filter((c) => c.project_code === code)
      .reduce((s, c) => s + c.amount, 0);
    const actualCashOut = postedCash
      .filter((t) => t.type === "out" && t.project_code === code && isPosted(t.status))
      .reduce((s, t) => s + t.amount, 0);
    const forecastCashIn = activeForecasts
      .filter((f) => f.type === "in" && f.project_code === code && f.status !== "cancelled")
      .reduce((s, f) => s + f.amount * (f.probability_pct / 100), 0);
    const forecastCashOut = activeForecasts
      .filter((f) => f.type === "out" && f.project_code === code && f.status !== "cancelled")
      .reduce((s, f) => s + f.amount * (f.probability_pct / 100), 0);
    const approvedNet = toNum(latest.approved_net_total);
    const rawOutstanding = approvedNet - actualCollected;
    const overCollected = Math.max(0, -rawOutstanding);
    const outstanding = Math.max(0, rawOutstanding);
    const flags: string[] = [];
    if (overCollected > 0) flags.push("over_collected");
    if (approvedNet <= 0 && actualCollected > 0) flags.push("collection_without_approved_ipc");
    if (toNum(latest.work_total) > toNum(latest.contract_value) * 1.05 && toNum(latest.contract_value) > 0) flags.push("submitted_above_contract");
    if (toNum(latest.contract_value) <= 0) flags.push("missing_contract_value");
    if (flags.includes("over_collected")) {
      risks.push({
        severity: "critical",
        code: "OVER_COLLECTION",
        project_code: code,
        project_name: latest.project_name,
        message: `${code}: collected exceeds approved net by ${overCollected.toLocaleString("en-US")}`,
        value: overCollected,
      });
      pushControlIssue(controlIssues, {
        severity: "critical",
        code: "OVER_COLLECTION",
        title: "Over-collection",
        detail: `${code} has posted collections above approved net value.`,
        project_code: code,
        value: overCollected,
      });
    }
    if (flags.includes("collection_without_approved_ipc")) {
      pushControlIssue(controlIssues, {
        severity: "warning",
        code: "COLLECTION_WITHOUT_APPROVAL",
        title: "Collection without approved IPC",
        detail: `${code} has posted collection value but no approved net IPC value.`,
        project_code: code,
        value: actualCollected,
      });
    }
    if (flags.includes("submitted_above_contract")) {
      pushControlIssue(controlIssues, {
        severity: "warning",
        code: "SUBMITTED_ABOVE_CONTRACT",
        title: "Submitted value above contract",
        detail: `${code} submitted cumulative value is more than 105% of contract value.`,
        project_code: code,
        value: toNum(latest.work_total),
      });
    }
    if (flags.includes("missing_contract_value")) {
      pushControlIssue(controlIssues, {
        severity: "warning",
        code: "MISSING_CONTRACT_VALUE",
        title: "Missing contract value",
        detail: `${code} has no contract value, so completion and exposure ratios are unreliable.`,
        project_code: code,
      });
    }
    if (outstanding > 0 && latest.approval_date) {
      const days = Math.floor((now - new Date(latest.approval_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days > 60) {
        risks.push({
          severity: days > 120 ? "critical" : "warning",
          code: "AGING_RECEIVABLE",
          project_code: code,
          project_name: latest.project_name,
          message: `${code}: outstanding receivable is ${days} days old`,
          value: outstanding,
        });
        pushControlIssue(controlIssues, {
          severity: days > 120 ? "critical" : "warning",
          code: "AGING_RECEIVABLE",
          title: "Aging receivable",
          detail: `${code} has outstanding approved receivable older than ${days} days.`,
          project_code: code,
          value: outstanding,
        });
      }
    }

    projects.push({
      project_code: code,
      project_name: latest.project_name,
      client: latest.client || "Unknown",
      sector: latest.sector || "Other",
      contract_value: toNum(latest.contract_value),
      submitted_total: toNum(latest.work_total),
      submitted_current: toNum(latest.work_current || latest.work_total),
      approved_total: toNum(latest.approved_total),
      approved_current: toNum(latest.approved_current || latest.approved_total),
      approved_net: approvedNet,
      total_deductions: toNum(latest.approved_deductions || latest.total_deductions),
      actual_collected: actualCollected,
      forecast_cash_in: forecastCashIn || outstanding,
      actual_cash_out: actualCashOut,
      forecast_cash_out: forecastCashOut,
      outstanding,
      over_collected_amount: overCollected,
      collection_efficiency: approvedNet > 0 ? actualCollected / approvedNet : 0,
      expected_cash_in: outstanding,
      ipc_count: projectInvoices.length,
      latest_ipc_number: latest.invoice_number || "-",
      latest_ipc_sort: getIpcSortValue(latest.invoice_number, latest.submitted_date || latest.created_at),
      status: latest.status,
      approval_date: latest.approval_date,
      currency: "EGP",
      flags,
    });
  });

  projects.sort((a, b) => b.outstanding - a.outstanding || b.contract_value - a.contract_value || a.project_code.localeCompare(b.project_code));

  const orphanCollections = collections.filter((c) => isPosted(c.status) && !projectCodes.has(c.project_code));
  if (orphanCollections.length > 0) {
    pushControlIssue(controlIssues, {
      severity: "warning",
      code: "ORPHAN_COLLECTIONS",
      title: "Unlinked collection rows",
      detail: `${orphanCollections.length} posted collection row(s) do not match visible IPC project codes.`,
      value: orphanCollections.reduce((sum, row) => sum + row.amount, 0),
    });
  }

  const legacyCollections = collections.filter(isLegacyCollection);
  if (legacyCollections.length > 0) {
    pushControlIssue(controlIssues, {
      severity: "medium",
      code: "LEGACY_COLLECTION_FALLBACK",
      title: "Legacy collection fallback",
      detail: "Collections include invoice-level legacy totals. Backfill collection_transactions to make finance reporting fully ledger-based.",
      value: legacyCollections.reduce((sum, row) => sum + row.amount, 0),
      suggested_action: "Run data migration to populate collection_transactions table from legacy invoice totals.",
    });
  }

  // §5.5 — Stale submitted IPC with no approval
  latestByProject.forEach((latest, code) => {
    if (!latest.approval_date && latest.submitted_date) {
      const days = Math.floor((now - new Date(latest.submitted_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days > 30) {
        pushControlIssue(controlIssues, {
          severity: days > 60 ? "high" : "medium",
          code: "STALE_SUBMITTED_IPC",
          title: "Stale submitted IPC without approval",
          detail: `${code}: IPC #${latest.invoice_number || "-"} submitted ${days} days ago with no approval date.`,
          project_code: code,
          value: toNum(latest.work_total),
          suggested_action: "Follow up with approving authority to obtain approval or rejection for this IPC.",
        });
      }
    }
  });

  // §5.5 — Suspicious repeated collection amount (3+ identical amounts for same project)
  const collectionAmountMap = new Map<string, Map<string, number>>();
  for (const c of postedCollections) {
    const key = c.project_code;
    const amountKey = c.amount.toFixed(2);
    if (!collectionAmountMap.has(key)) collectionAmountMap.set(key, new Map());
    const counts = collectionAmountMap.get(key)!;
    counts.set(amountKey, (counts.get(amountKey) || 0) + 1);
  }
  collectionAmountMap.forEach((amounts, projectCode) => {
    amounts.forEach((count, amount) => {
      if (count >= 3) {
        pushControlIssue(controlIssues, {
          severity: "medium",
          code: "SUSPICIOUS_REPEATED_AMOUNT",
          title: "Suspicious repeated collection amount",
          detail: `${projectCode}: amount ${amount} appears ${count} times in posted collections.`,
          project_code: projectCode,
          value: Number(amount) * count,
          suggested_action: "Review these collection entries for possible duplicates or data entry errors.",
        });
      }
    });
  });

  // §5.5 — Duplicate transaction fingerprint
  const dedupeKeyCount = new Map<string, number>();
  for (const c of collections) {
    dedupeKeyCount.set(c.dedupe_key, (dedupeKeyCount.get(c.dedupe_key) || 0) + 1);
  }
  dedupeKeyCount.forEach((count, key) => {
    if (count > 1) {
      pushControlIssue(controlIssues, {
        severity: "high",
        code: "DUPLICATE_TRANSACTION_FINGERPRINT",
        title: "Duplicate transaction fingerprint",
        detail: `Dedupe key "${key.slice(0, 40)}..." appears ${count} times in collection records.`,
        suggested_action: "Remove or reverse duplicate collection entries. Check import deduplication logic.",
      });
    }
  });

  const monthMap = new Map<string, MonthlyFinancialSummary>();
  for (const inv of filteredInvoices) {
    const key = monthKey(inv.submitted_date || inv.created_at);
    if (!key) continue;
    const m = addMonth(monthMap, key);
    m.submitted += toNum(inv.work_current || inv.work_total);
    m.approved += toNum(inv.approved_current || inv.approved_total);
  }
  for (const c of postedCollections) {
    const key = monthKey(c.collection_month || c.collection_date);
    if (!key) continue;
    addMonth(monthMap, key).actualCollected += c.amount;
  }
  for (const t of postedCash) {
    const key = monthKey(t.transaction_month || t.transaction_date);
    if (!key || !isPosted(t.status)) continue;
    const m = addMonth(monthMap, key);
    if (t.type === "in") m.actualCollected += t.category === "client_collection" ? 0 : t.amount;
    else m.actualCashOut += t.amount;
  }
  for (const f of activeForecasts) {
    const key = monthKey(f.forecast_month || f.forecast_date);
    if (!key || f.status === "cancelled" || f.status === "closed") continue;
    const weighted = f.amount * (f.probability_pct / 100);
    const m = addMonth(monthMap, key);
    if (f.type === "in") m.forecastCashIn += weighted;
    else m.forecastCashOut += weighted;
  }

  const monthly = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  let cumulativeActual = 0;
  let cumulativeForecast = 0;
  for (const m of monthly) {
    m.netActual = m.actualCollected - m.actualCashOut;
    m.netForecast = (m.actualCollected + m.forecastCashIn) - (m.actualCashOut + m.forecastCashOut);
    cumulativeActual += m.netActual;
    cumulativeForecast += m.netForecast;
    m.cumulativeActual = cumulativeActual;
    m.cumulativeForecast = cumulativeForecast;
  }

  const aging: AgingBucket[] = [
    { label: "0-30 days", labelAr: "0-30 days", days: "0-30", amount: 0, count: 0, projects: [] },
    { label: "31-60 days", labelAr: "31-60 days", days: "31-60", amount: 0, count: 0, projects: [] },
    { label: "61-90 days", labelAr: "61-90 days", days: "61-90", amount: 0, count: 0, projects: [] },
    { label: "91-120 days", labelAr: "91-120 days", days: "91-120", amount: 0, count: 0, projects: [] },
    { label: "120+ days", labelAr: "120+ days", days: "120+", amount: 0, count: 0, projects: [] },
  ];
  for (const p of projects) {
    if (p.outstanding <= 0) continue;
    const days = p.approval_date
      ? Math.floor((now - new Date(p.approval_date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const bucket = days <= 30 ? aging[0] : days <= 60 ? aging[1] : days <= 90 ? aging[2] : days <= 120 ? aging[3] : aging[4];
    bucket.amount += p.outstanding;
    bucket.count += 1;
    bucket.projects.push(p.project_code);
  }

  const portfolio: PortfolioFinancialSummary = {
    ...EMPTY_PORTFOLIO,
    total_contract_value: projects.reduce((s, p) => s + p.contract_value, 0),
    total_submitted: projects.reduce((s, p) => s + p.submitted_total, 0),
    total_approved: projects.reduce((s, p) => s + p.approved_total, 0),
    total_approved_net: projects.reduce((s, p) => s + p.approved_net, 0),
    total_collections: projects.reduce((s, p) => s + p.actual_collected, 0),
    total_forecast_cash_in: projects.reduce((s, p) => s + p.forecast_cash_in, 0),
    total_cash_out: postedCash.filter((t) => t.type === "out" && isPosted(t.status)).reduce((s, t) => s + t.amount, 0),
    total_forecast_cash_out: activeForecasts.filter((f) => f.type === "out" && f.status !== "cancelled").reduce((s, f) => s + f.amount * (f.probability_pct / 100), 0),
    total_outstanding: projects.reduce((s, p) => s + p.outstanding, 0),
    total_over_collected: projects.reduce((s, p) => s + p.over_collected_amount, 0),
    project_count: projects.length,
    active_project_count: projects.filter((p) => !/completed|cancelled|منتهي|ملغ/i.test(p.status)).length,
  };
  portfolio.net_actual_cash = portfolio.total_collections - portfolio.total_cash_out;
  portfolio.net_forecast_cash = (portfolio.total_collections + portfolio.total_forecast_cash_in) - (portfolio.total_cash_out + portfolio.total_forecast_cash_out);
  portfolio.overall_collection_rate = portfolio.total_approved_net > 0 ? portfolio.total_collections / portfolio.total_approved_net : 0;

  const criticalCount = controlIssues.filter((issue) => issue.severity === "critical").length;
  const warningCount = controlIssues.filter((issue) => issue.severity === "warning").length;
  const usesLegacyCollections = collections.some(isLegacyCollection);
  const sourceMode: "ledger" | "legacy" = usesLegacyCollections ? "legacy" : "ledger";
  const readiness: FinancialReadiness = {
    mode: usesLegacyCollections ? "legacy-fallback" : postedCollections.length > 0 ? "online-ledger" : "empty-ledger",
    score: Math.max(0, Math.min(100, 100 - criticalCount * 25 - warningCount * 8)),
    blockingIssues: criticalCount,
    warningIssues: warningCount,
    issueCount: controlIssues.length,
  };

  return {
    projects,
    portfolio,
    monthly,
    monthlyTrend: monthly,
    aging,
    risks: risks.sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, warning: 2, medium: 3, low: 4, info: 5 };
      return order[a.severity] - order[b.severity] || (b.value || 0) - (a.value || 0);
    }),
    collections: postedCollections,
    cashFlowTransactions: postedCash,
    forecasts: activeForecasts,
    controlIssues: controlIssues.sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, warning: 2, medium: 3, low: 4, info: 5 };
      return order[a.severity] - order[b.severity] || (b.value || 0) - (a.value || 0);
    }),
    readiness,
    sourceMode,
  };
}

export function useCollectionTransactions() {
  return useQuery({
    queryKey: ["collection-transactions"],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: fetchCollectionTransactions,
  });
}

export function useCashFlowLedger() {
  const transactions = useQuery({
    queryKey: ["cash-flow-transactions"],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: fetchCashFlowTransactions,
  });
  const forecasts = useQuery({
    queryKey: ["cash-flow-forecasts"],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: fetchCashFlowForecasts,
  });
  return {
    transactions: transactions.data || [],
    forecasts: forecasts.data || [],
    isLoading: transactions.isLoading || forecasts.isLoading,
    error: transactions.error || forecasts.error,
  };
}

export function useFinancialSnapshot(filters?: FinancialSnapshotFilters) {
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useInvoices();
  const collectionQuery = useCollectionTransactions();
  const cashFlow = useCashFlowLedger();

  const collections = useMemo(() => {
    const ledgerCollections = collectionQuery.data || [];
    return ledgerCollections.length > 0 ? ledgerCollections : buildLegacyCollections(invoices);
  }, [collectionQuery.data, invoices]);

  const snapshot = useMemo(
    () => computeFinancialSnapshot({
      invoices,
      collections,
      cashFlowTransactions: cashFlow.transactions,
      forecasts: cashFlow.forecasts,
      filters,
    }),
    [invoices, collections, cashFlow.transactions, cashFlow.forecasts, filters]
  );

  return {
    ...snapshot,
    invoices,
    isLoading: invoicesLoading || collectionQuery.isLoading || cashFlow.isLoading,
    error: invoicesError || collectionQuery.error || cashFlow.error,
  };
}

export function useProjectFinancialSummary(projectCode: string | null | undefined) {
  const snapshot = useFinancialSnapshot(projectCode ? { projectCodes: [projectCode] } : undefined);
  return {
    ...snapshot,
    project: snapshot.projects.find((p) => p.project_code === projectCode) || null,
  };
}

export function useMonthlyFinancialSummary(filters?: FinancialSnapshotFilters) {
  const snapshot = useFinancialSnapshot(filters);
  return {
    monthly: snapshot.monthly,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
  };
}
