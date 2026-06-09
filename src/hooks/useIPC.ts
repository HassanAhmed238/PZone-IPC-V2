import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Cache Configuration ─────────────────────────────── */
const CACHE = {
  /** Main invoice list — keep fresh for 2 min, GC after 10 min */
  invoices: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  /** Stats / analytics — heavier queries, 5 min stale */
  stats: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  /** Single invoice — 1 min stale */
  single: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
} as const;

/** Detect Supabase errors indicating a table/schema is not yet migrated */
function isTableMissingError(error: any): boolean {
  const msg = String(error?.message || "");
  return /does not exist|schema cache|Could not find|relation .* does not exist/i.test(msg);
}

/** Invalidate all IPC-related queries in one batch */
function invalidateAllIPC(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["invoiceStats"] });
  qc.invalidateQueries({ queryKey: ["invoiceSectorStats"] });
  qc.invalidateQueries({ queryKey: ["invoiceClientStats"] });
  qc.invalidateQueries({ queryKey: ["invoiceMonthlyTrend"] });
  qc.invalidateQueries({ queryKey: ["invoiceGapAnalysis"] });
  qc.invalidateQueries({ queryKey: ["invoiceCollectionByClient"] });
  qc.invalidateQueries({ queryKey: ["invoiceAlerts"] });
  qc.invalidateQueries({ queryKey: ["invoiceProjectHistory"] });
}

/* ─── Types ──────────────────────────────────────────────── */

export interface DeductionItem {
  name: string;
  amount: number;
}

export interface VariationItem {
  vo_number: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  project_code: string;
  sector: string | null;
  submitted_date: string | null;
  project_name: string;
  client: string | null;
  contract_value: number;
  invoice_number: string | null;
  work_previous: number;
  work_current: number;
  work_total: number;
  total_deductions: number;
  net_previous: number;
  net_current: number;
  net_total: number;
  /* Deductions / VOs / Fluctuation — Submitted */
  deductions_breakdown: DeductionItem[];
  variations: VariationItem[];
  fluctuation_amount: number;
  /* Approved */
  approved_previous: number;
  approved_current: number;
  approved_total: number;
  approved_deductions: number;
  approved_net_previous: number;
  approved_net_current: number;
  approved_net_total: number;
  approved_deductions_breakdown: DeductionItem[];
  approved_variations: VariationItem[];
  approved_fluctuation_amount: number;
  /* Tax */
  tax_type: string;              // 'none' | '5%' | '5.04%' | '14%' | 'custom'
  tax_amount: number;
  tax_direction: string;         // 'added' | 'withheld'
  approved_tax_type: string;
  approved_tax_amount: number;
  approved_tax_direction: string;
  /* Linking & status */
  status: string;
  invoice_type: string;
  linked_submitted_id: string | null;
  approval_date: string | null;
  collection_date: string | null;
  approval_notes: string | null;
  contract_percentage: number;
  total_collections: number;
  unbilled: number;
  expected_collection: number;
  contract_id: string | null;
  project_id: string | null;
  ipc_project_id: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceInput = Omit<Invoice, "id" | "created_at" | "updated_at">;

export interface InvoiceStats {
  totalProjects: number;
  totalContractValue: number;
  totalSubmitted: number;
  totalApproved: number;
  totalCollections: number;
  totalUnbilled: number;
  pendingCount: number;
  approvedCount: number;
}

export interface SectorStat {
  sector: string;
  count: number;
  totalValue: number;
}

export interface ClientStat {
  client: string;
  count: number;
  totalValue: number;
}

/* ─── LocalStorage persistence ───────────────────────────── */

const LS_KEY = "pzone_invoices";

function getLocalInvoices(): Invoice[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalInvoices(invoices: Invoice[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(invoices));
}

/** Merge two invoice arrays, preferring DB records when duplicates exist */
function mergeInvoices(dbInvoices: Invoice[], lsInvoices: Invoice[]): Invoice[] {
  const byKey = new Map<string, Invoice>();
  // First add LS records (keyed by project_code + invoice_number)
  lsInvoices.forEach((inv) => {
    const key = `${inv.project_code}::${inv.invoice_number ?? ""}`;
    byKey.set(key, inv);
  });
  // Then overwrite/add DB records (higher priority)
  dbInvoices.forEach((inv) => {
    const key = `${inv.project_code}::${inv.invoice_number ?? ""}`;
    byKey.set(key, inv);
  });
  return Array.from(byKey.values());
}

/* ─── Table availability check (with TTL to recover from transient errors) ── */

let _tableAvailable: boolean | null = null;
let _tableCheckedAt = 0;
const TABLE_CHECK_TTL = 5 * 60 * 1000; // Re-check every 5 minutes

async function isTableAvailable(): Promise<boolean> {
  const now = Date.now();
  // Use cached result if still within TTL
  if (_tableAvailable !== null && (now - _tableCheckedAt) < TABLE_CHECK_TTL) {
    return _tableAvailable;
  }
  try {
    // Probe the columns required by the current IPC module. Some Supabase projects
    // have an older invoices table that can be selected but cannot accept the
    // current IPC payload, which makes the log appear empty or fail on save.
    const requiredColumns = [
      "id",
      "deductions_breakdown",
      "approved_deductions_breakdown",
      "variations",
      "approved_variations",
      "tax_type",
      "tax_direction",
      "tax_amount",
      "approved_tax_type",
      "approved_tax_direction",
      "approved_tax_amount",
      "fluctuation_amount",
      "approved_fluctuation_amount",
      "ipc_project_id",
    ].join(", ");
    const { error } = await supabase.from("invoices").select(requiredColumns).limit(0);
    _tableAvailable = !error;
    _tableCheckedAt = now;
    if (error) {
      console.warn("[IPC] Supabase invoices table columns not fully migrated, using localStorage:", error.message);
    }
  } catch {
    _tableAvailable = false;
    _tableCheckedAt = now;
  }
  return _tableAvailable;
}

/** Reset table availability check (e.g., after a successful DB operation) */
function markTableAvailable() {
  _tableAvailable = true;
  _tableCheckedAt = Date.now();
}

/* ─── Auto-calc helper ───────────────────────────────────── */

export function autoCalc<T extends Partial<InvoiceInput>>(input: T): T {
  const v = { ...input };

  // 1. Recover legacy flat inputs (e.g. from Excel imports or older records)
  // Deductions: if total_deductions is present but breakdown is empty
  if ((!v.deductions_breakdown || v.deductions_breakdown.length === 0) && (v.total_deductions || 0) > 0) {
    v.deductions_breakdown = [{ name: "Deductions / استقطاعات", amount: v.total_deductions }];
  }
  // Approved Deductions
  if ((!v.approved_deductions_breakdown || v.approved_deductions_breakdown.length === 0) && (v.approved_deductions || 0) > 0) {
    v.approved_deductions_breakdown = [{ name: "Approved Deductions / استقطاعات معتمدة", amount: v.approved_deductions }];
  }

  // Variations (VOs): If work_total is larger than base work (previous + current), difference represents variations
  const baseWork = (v.work_previous || 0) + (v.work_current || 0);
  const diff = (v.work_total || 0) - baseWork - (v.fluctuation_amount || 0);
  if (diff > 0 && (!v.variations || v.variations.length === 0)) {
    v.variations = [{ vo_number: "VO-MISC", description: "Other Variations / بنود أخرى", amount: diff }];
  }

  // Approved Variations
  const approvedBaseWork = (v.approved_previous || 0) + (v.approved_current || 0);
  const approvedDiff = (v.approved_total || 0) - approvedBaseWork - (v.approved_fluctuation_amount || 0);
  if (approvedDiff > 0 && (!v.approved_variations || v.approved_variations.length === 0)) {
    v.approved_variations = [{ vo_number: "VO-MISC", description: "Other Variations / بنود أخرى", amount: approvedDiff }];
  }

  // 2. Sum VO amounts from detailed lists
  const voTotal = (v.variations || []).reduce((s, vo) => s + (vo.amount || 0), 0);
  const approvedVoTotal = (v.approved_variations || []).reduce((s, vo) => s + (vo.amount || 0), 0);

  // 3. Recalculate Totals (include VOs + fluctuation)
  // BUG-4 fix: Only recalculate if breakdown fields are provided;
  // preserve existing work_total for Excel imports that only set the total.
  const hasBreakdown = (v.work_previous || 0) > 0 || (v.work_current || 0) > 0 || voTotal > 0 || (v.fluctuation_amount || 0) > 0;
  if (hasBreakdown) {
    v.work_total = (v.work_previous || 0) + (v.work_current || 0) + voTotal + (v.fluctuation_amount || 0);
  }
  v.total_deductions = (v.deductions_breakdown || []).reduce((s, d) => s + (d.amount || 0), 0);
  
  // Net = work - deductions ± tax
  v.net_previous = (v.work_previous || 0);
  const submittedBase = (v.work_total || 0) - (v.total_deductions || 0);
  // tax_direction: 'added' = tax is on top (contractor charges VAT), 'withheld' = tax taken out
  const taxDir = v.tax_direction || 'added';
  const taxAmt = v.tax_amount || 0;
  v.net_total = taxDir === 'added' ? submittedBase + taxAmt : submittedBase - taxAmt;
  v.net_current = (v.net_total || 0) - (v.net_previous || 0);

  // Approved totals
  v.approved_total = (v.approved_previous || 0) + (v.approved_current || 0) + approvedVoTotal + (v.approved_fluctuation_amount || 0);
  v.approved_deductions = (v.approved_deductions_breakdown || []).reduce((s, d) => s + (d.amount || 0), 0);
  
  const approvedBase = (v.approved_total || 0) - (v.approved_deductions || 0);
  const appTaxDir = v.approved_tax_direction || 'added';
  const appTaxAmt = v.approved_tax_amount || 0;
  v.approved_net_total = appTaxDir === 'added' ? approvedBase + appTaxAmt : approvedBase - appTaxAmt;
  v.approved_net_previous = (v.approved_previous || 0);
  v.approved_net_current = (v.approved_net_total || 0) - (v.approved_net_previous || 0);

  // 4. Contract percentage
  if ((v.contract_value || 0) > 0) {
    v.contract_percentage = (v.work_total || 0) / (v.contract_value || 1);
  }
  return v;
}

/* ─── Hooks ──────────────────────────────────────────────── */

export function useInvoices(projectCode?: string) {
  return useQuery({
    queryKey: ["invoices", projectCode],
    staleTime: CACHE.invoices.staleTime,
    gcTime: CACHE.invoices.gcTime,
    queryFn: async () => {
      const lsInv = getLocalInvoices();
      const useDB = await isTableAvailable();
      if (!useDB) {
        let inv = lsInv;
        if (projectCode) inv = inv.filter((i) => i.project_code === projectCode);
        return inv;
      }
      let q = supabase
        .from("invoices")
        .select("*")
        .order("project_code", { ascending: true })
        .order("invoice_number", { ascending: true });
      if (projectCode) q = q.eq("project_code", projectCode);
      const { data, error } = await q;
      if (error) {
        // Table not yet migrated — expected, fall back silently
        if (isTableMissingError(error)) {
          _tableAvailable = false;
          _tableCheckedAt = Date.now();
          let inv = lsInv;
          if (projectCode) inv = inv.filter((i) => i.project_code === projectCode);
          return inv;
        }
        // Real error (RLS, network, etc.) — warn the user, data may be stale
        console.warn("[IPC] Query error:", error.message);
        toast.warning("Invoice data may be stale — database query failed.");
        _tableAvailable = false;
        _tableCheckedAt = Date.now() - TABLE_CHECK_TTL + 30_000; // Retry in 30s
        let inv = lsInv;
        if (projectCode) inv = inv.filter((i) => i.project_code === projectCode);
        return inv;
      }
      markTableAvailable();
      // Merge DB + localStorage to ensure records created while offline remain visible
      // until they are synced or the user decides to drop them.
      let merged = mergeInvoices((data || []) as Invoice[], lsInv);
      if (projectCode) merged = merged.filter((i) => i.project_code === projectCode);
      return merged;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    staleTime: CACHE.single.staleTime,
    gcTime: CACHE.single.gcTime,
    queryFn: async () => {
      if (!id) return null;
      const useDB = await isTableAvailable();
      if (!useDB) {
        return getLocalInvoices().find((i) => i.id === id) || null;
      }
      const { data, error } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (error) return getLocalInvoices().find((i) => i.id === id) || null;
      return data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<InvoiceInput>) => {
      const row = autoCalc(input);
      const useDB = await isTableAvailable();
      if (!useDB) {
        throw new Error("Online invoices table is not available. Run the IPC Supabase migrations before saving.");
      }
      const { data, error } = await supabase.from("invoices").insert(row as any).select().single();
      if (error) {
        throw new Error(`Online invoice save failed: ${error.message}`);
      }
      return data as Invoice;
    },
    onSuccess: () => {
      invalidateAllIPC(qc);
      toast.success("تم إضافة المستخلص بنجاح (Invoice added)");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const row = autoCalc(updates);
      const useDB = await isTableAvailable();
      if (!useDB) {
        throw new Error("Online invoices table is not available. Run the IPC Supabase migrations before saving.");
      }
      const { data, error } = await supabase.from("invoices").update(row as any).eq("id", id).select().single();
      if (error) {
        throw new Error(`Online invoice update failed: ${error.message}`);
      }
      return data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      invalidateAllIPC(qc);
      toast.success("تم تحديث المستخلص بنجاح (Invoice updated)");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ─── Soft Delete / Trash System (30-day recovery) ───── */

const LS_TRASH_KEY = "pzone_ipc_trash";

export interface DeletedInvoice {
  invoice: Invoice;
  deleted_at: string;
  deleted_by: string | null; // user email
  expires_at: string;        // 30 days from deletion
}

function getTrash(): DeletedInvoice[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_TRASH_KEY) || "[]") as DeletedInvoice[];
    // Auto-purge expired items (older than 30 days)
    const now = new Date().getTime();
    const valid = raw.filter((d) => new Date(d.expires_at).getTime() > now);
    if (valid.length !== raw.length) localStorage.setItem(LS_TRASH_KEY, JSON.stringify(valid));
    return valid;
  } catch { return []; }
}

function addToTrash(invoice: Invoice, userEmail: string | null) {
  const trash = getTrash();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  trash.push({
    invoice,
    deleted_at: now.toISOString(),
    deleted_by: userEmail,
    expires_at: expires.toISOString(),
  });
  localStorage.setItem(LS_TRASH_KEY, JSON.stringify(trash));
}

function removeFromTrash(invoiceId: string) {
  const trash = getTrash().filter((d) => d.invoice.id !== invoiceId);
  localStorage.setItem(LS_TRASH_KEY, JSON.stringify(trash));
}

export function useDeletedInvoices() {
  return useQuery({
    queryKey: ["invoiceTrash"],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => getTrash(),
  });
}

export function useRestoreInvoice() {
  const qc = useQueryClient();
  const create = useCreateInvoice();
  return useMutation({
    mutationFn: async (deletedItem: DeletedInvoice) => {
      const { id, created_at, updated_at, ...rest } = deletedItem.invoice;
      // Re-create the invoice
      const result = await create.mutateAsync(rest as any);
      // Remove from trash
      removeFromTrash(deletedItem.invoice.id);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoiceTrash"] });
      invalidateAllIPC(qc);
      toast.success("تم استرجاع المستخلص (Invoice restored from trash)");
    },
    onError: () => toast.error("Failed to restore invoice"),
  });
}

export function usePermanentlyDeleteFromTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      removeFromTrash(invoiceId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoiceTrash"] });
      toast.success("Permanently deleted from trash");
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userEmail }: { id: string; userEmail: string | null }) => {
      // Snapshot the invoice to trash BEFORE deleting
      const allCached = qc.getQueryData<Invoice[]>(["invoices", undefined]) || qc.getQueryData<Invoice[]>(["invoices"]) || [];
      const invoiceToDelete = allCached.find((inv) => inv.id === id);
      if (invoiceToDelete) {
        addToTrash(invoiceToDelete, userEmail);
      } else {
        // Try fetching from localStorage
        const localInv = getLocalInvoices().find((i) => i.id === id);
        if (localInv) addToTrash(localInv, userEmail);
      }

      // ALWAYS remove from localStorage — mergeInvoices reads both DB + LS,
      // so if we only delete from DB, the LS copy will resurface on refetch.
      saveLocalInvoices(getLocalInvoices().filter((i) => i.id !== id));

      const useDB = await isTableAvailable();
      if (!useDB) return; // Already removed from LS above
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) {
        _tableAvailable = false;
        // LS already cleaned — no further action needed
      }
    },
    /* ── Optimistic delete: instantly remove from UI ── */
    onMutate: async ({ id }: { id: string; userEmail: string | null }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: ["invoices"] });
      // Snapshot all invoice query caches for rollback
      const previousQueries = qc.getQueriesData({ queryKey: ["invoices"] });
      // Optimistically remove the invoice from every cached query
      qc.setQueriesData({ queryKey: ["invoices"] }, (old: Invoice[] | undefined) => {
        if (!old) return old;
        return old.filter((inv) => inv.id !== id);
      });
      return { previousQueries };
    },
    onError: (_err: any, _vars, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
      toast.error("Failed to delete — rolled back");
    },
    onSettled: () => {
      // Always refetch to ensure server state is in sync
      invalidateAllIPC(qc);
      qc.invalidateQueries({ queryKey: ["invoiceTrash"] });
    },
    onSuccess: () => {
      toast.success("تم حذف المستخلص — يمكن استرجاعه خلال 30 يوم (Moved to trash)");
    },
  });
}

export function useBulkCreateInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: Partial<InvoiceInput>[]) => {
      const rows = inputs.map((i) => autoCalc(i));
      const useDB = await isTableAvailable();
      if (!useDB) {
        throw new Error("Online invoices table is not available. Run the IPC Supabase migrations before importing.");
      }
      const { data, error } = await supabase.from("invoices").insert(rows as any[]).select();
      if (error) {
        // Only fall back to localStorage for table-missing errors
        if (isTableMissingError(error)) {
          throw new Error("Invoices table not yet migrated. Run the IPC Supabase migrations.");
        }
        throw new Error(`Bulk import failed: ${error.message}`);
      }
      return (data || []) as Invoice[];
    },
    onSuccess: (data) => {
      invalidateAllIPC(qc);
      toast.success(`تم استيراد ${data.length} مستخلص (${data.length} invoices imported)`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ─── Stats helpers (always work from the same data source) ─ */

async function fetchAllInvoices(): Promise<Invoice[]> {
  const lsInv = getLocalInvoices();
  const useDB = await isTableAvailable();
  if (!useDB) return lsInv;
  const { data, error } = await supabase.from("invoices").select("*");
  if (error) {
    _tableAvailable = false;
    return lsInv;
  }
  // Merge DB + localStorage (seed data)
  return mergeInvoices((data || []) as Invoice[], lsInv);
}

async function syncLocalInvoicesToSupabase(localInvoices: Invoice[]): Promise<number> {
  if (localInvoices.length === 0) return 0;

  const useDB = await isTableAvailable();
  if (!useDB) return 0;

  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id, project_code, invoice_number");

  if (existingError) {
    console.warn("[IPC Share] Could not read online invoices before sync:", existingError.message);
    return 0;
  }

  const rowKey = (projectCode: string, invoiceNumber: string | null | undefined) =>
    `${projectCode}::${invoiceNumber || ""}`;
  const existingByKey = new Map(
    (existing || []).map((row: any) => [rowKey(row.project_code, row.invoice_number), row.id])
  );

  let synced = 0;
  for (const invoice of localInvoices) {
    const { id, created_at, updated_at, share_token, ...rest } = invoice as any;
    const row = { ...rest };
    const existingId = existingByKey.get(rowKey(invoice.project_code, invoice.invoice_number));
    const result = existingId
      ? await supabase.from("invoices").update(row).eq("id", existingId)
      : await supabase.from("invoices").insert(row);

    if (result.error) {
      console.warn("[IPC Share] Online invoice sync skipped for", invoice.project_code, result.error.message);
      continue;
    }
    synced += 1;
  }

  if (synced > 0) markTableAvailable();
  return synced;
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoiceStats"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const projects = new Set(invoices.map((i) => i.project_code));
      return {
        totalProjects: projects.size,
        totalContractValue: invoices.reduce((s, i) => s + (i.contract_value || 0), 0),
        totalSubmitted: invoices.reduce((s, i) => s + (i.work_total || 0), 0),
        totalApproved: invoices.reduce((s, i) => s + (i.approved_total || 0), 0),
        totalCollections: invoices.reduce((s, i) => s + (i.total_collections || 0), 0),
        totalUnbilled: invoices.reduce((s, i) => s + (i.unbilled || 0), 0),
        pendingCount: invoices.filter((i) => i.status === "تحت الاعتماد").length,
        approvedCount: invoices.filter((i) => i.status === "معتمد").length,
      } as InvoiceStats;
    },
  });
}

export function useInvoiceSectorStats() {
  return useQuery({
    queryKey: ["invoiceSectorStats"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const map = new Map<string, SectorStat>();
      invoices.forEach((inv) => {
        const s = inv.sector || "Other";
        const cur = map.get(s) || { sector: s, count: 0, totalValue: 0 };
        cur.count++;
        cur.totalValue += inv.contract_value || 0;
        map.set(s, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
    },
  });
}

export function useInvoiceClientStats() {
  return useQuery({
    queryKey: ["invoiceClientStats"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const map = new Map<string, ClientStat>();
      invoices.forEach((inv) => {
        const c = (inv.client || "Unknown").trim();
        const cur = map.get(c) || { client: c, count: 0, totalValue: 0 };
        cur.count++;
        cur.totalValue += inv.contract_value || 0;
        map.set(c, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
    },
  });
}

/* ─── New Analytics Hooks ────────────────────────────────────── */

export interface MonthlyTrendItem {
  month: string;       // e.g. "Jan 25"
  submitted: number;
  approved: number;
  collected: number;
}

export function useMonthlyTrend() {
  return useQuery({
    queryKey: ["invoiceMonthlyTrend"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const map = new Map<string, MonthlyTrendItem>();
      invoices.forEach((inv) => {
        const raw = inv.submitted_date || inv.created_at;
        if (!raw) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const cur = map.get(key) || { month: label, submitted: 0, approved: 0, collected: 0 };
        cur.submitted += inv.work_total || 0;
        cur.approved += inv.approved_total || 0;
        cur.collected += inv.total_collections || 0;
        map.set(key, cur);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
    },
  });
}

export interface GapAnalysisItem {
  project_code: string;
  project_name: string;
  client: string;
  contract_value: number;
  submitted: number;
  approved: number;
  collected: number;
  gap: number;          // submitted - approved
  gapPct: number;       // gap / submitted
  collectionEff: number; // collected / approved_net_total
  approved_net_total: number;
}

export function useGapAnalysis() {
  return useQuery({
    queryKey: ["invoiceGapAnalysis"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      // BUG-5 fix: IPCs are cumulative (IPC #3 already includes IPC #1+#2 values),
      // so use only the LATEST invoice per project (highest invoice_number).
      const latestByProject = new Map<string, typeof invoices[0]>();
      invoices.forEach((inv) => {
        const existing = latestByProject.get(inv.project_code);
        const invNum = parseInt(inv.invoice_number || "0", 10);
        const existingNum = existing ? parseInt(existing.invoice_number || "0", 10) : -1;
        if (!existing || invNum > existingNum) {
          latestByProject.set(inv.project_code, inv);
        }
      });

      const results: GapAnalysisItem[] = [];
      latestByProject.forEach((inv) => {
        const submitted = inv.work_total || 0;
        const approved = inv.approved_total || 0;
        // Collections are per-invoice, so sum all invoices for the project
        const totalCollected = invoices
          .filter((i) => i.project_code === inv.project_code)
          .reduce((s, i) => s + (i.total_collections || 0), 0);
        const approved_net = inv.approved_net_total || 0;
        results.push({
          project_code: inv.project_code,
          project_name: inv.project_name,
          client: inv.client || "Unknown",
          contract_value: inv.contract_value || 0,
          submitted,
          approved,
          collected: totalCollected,
          gap: submitted - approved,
          gapPct: submitted > 0 ? (submitted - approved) / submitted : 0,
          collectionEff: approved_net > 0 ? totalCollected / approved_net : 0,
          approved_net_total: approved_net,
        });
      });
      return results.sort((a, b) => b.gap - a.gap);
    },
  });
}

export interface CollectionByClientItem {
  client: string;
  approved: number;
  collected: number;
  outstanding: number;
  efficiency: number;
  projectCount: number;
}

export function useCollectionByClient() {
  return useQuery({
    queryKey: ["invoiceCollectionByClient"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const map = new Map<string, CollectionByClientItem>();
      invoices.forEach((inv) => {
        const c = (inv.client || "Unknown").trim();
        const cur = map.get(c) || { client: c, approved: 0, collected: 0, outstanding: 0, efficiency: 0, projectCount: 0 };
        cur.approved += inv.approved_net_total || 0;
        cur.collected += inv.total_collections || 0;
        cur.projectCount++;
        cur.outstanding = cur.approved - cur.collected;
        cur.efficiency = cur.approved > 0 ? cur.collected / cur.approved : 0;
        map.set(c, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.approved - a.approved);
    },
  });
}

export interface IPCAlert {
  type: "critical" | "warning" | "info";
  message: string;
  messageAr: string;
  project_code: string;
  project_name: string;
  value?: number;
}

export function useIPCAlerts() {
  return useQuery({
    queryKey: ["invoiceAlerts"],
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      const invoices = await fetchAllInvoices();
      const alerts: IPCAlert[] = [];
      const now = Date.now();

      invoices.forEach((inv) => {
        // Large approval gap (>25% gap between submitted and approved)
        if (inv.work_total > 0 && inv.approved_total > 0) {
          const gap = inv.work_total - inv.approved_total;
          const gapPct = gap / inv.work_total;
          if (gapPct > 0.25) {
            alerts.push({
              type: "critical",
              message: `${inv.project_code}: Approval gap of ${(gapPct * 100).toFixed(0)}% — submitted vs approved`,
              messageAr: `${inv.project_code}: فجوة اعتماد ${(gapPct * 100).toFixed(0)}%`,
              project_code: inv.project_code,
              project_name: inv.project_name,
              value: gap,
            });
          }
        }

        // Pending for >30 days
        if (inv.status === "تحت الاعتماد" && inv.submitted_date) {
          const submittedMs = new Date(inv.submitted_date).getTime();
          const daysPending = Math.floor((now - submittedMs) / (1000 * 60 * 60 * 24));
          if (daysPending > 30) {
            alerts.push({
              type: "warning",
              message: `${inv.project_code}: Invoice #${inv.invoice_number || "?"} pending for ${daysPending} days`,
              messageAr: `${inv.project_code}: مستخلص #${inv.invoice_number || "?"} منتظر ${daysPending} يوم`,
              project_code: inv.project_code,
              project_name: inv.project_name,
              value: daysPending,
            });
          }
        }

        // Low collection efficiency (<50% of approved net collected)
        if ((inv.approved_net_total || 0) > 0 && inv.status === "معتمد") {
          const eff = (inv.total_collections || 0) / inv.approved_net_total;
          if (eff < 0.5) {
            alerts.push({
              type: "warning",
              message: `${inv.project_code}: Collection efficiency ${(eff * 100).toFixed(0)}% — below 50%`,
              messageAr: `${inv.project_code}: كفاءة التحصيل ${(eff * 100).toFixed(0)}% دون 50%`,
              project_code: inv.project_code,
              project_name: inv.project_name,
              value: eff,
            });
          }
        }
      });

      // Sort: critical first, then warning
      return alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.type] - order[b.type];
      });
    },
  });
}

export interface ProjectHistoryItem {
  invoice_number: string;
  submitted: number;
  approved: number;
  collected: number;
  deductions: number;
  status: string;
  submitted_date: string | null;
}

export function useProjectHistory(projectCode: string | null) {
  return useQuery({
    queryKey: ["invoiceProjectHistory", projectCode],
    enabled: !!projectCode,
    staleTime: CACHE.stats.staleTime,
    gcTime: CACHE.stats.gcTime,
    queryFn: async () => {
      if (!projectCode) return [];
      const invoices = await fetchAllInvoices();
      return invoices
        .filter((inv) => inv.project_code === projectCode)
        .sort((a, b) => {
          const na = parseInt(a.invoice_number || "0", 10);
          const nb = parseInt(b.invoice_number || "0", 10);
          return na - nb;
        })
        .map((inv) => ({
          invoice_number: inv.invoice_number || "—",
          submitted: inv.work_total || 0,
          approved: inv.approved_total || 0,
          collected: inv.total_collections || 0,
          deductions: inv.total_deductions || 0,
          status: inv.status,
          submitted_date: inv.submitted_date,
        })) as ProjectHistoryItem[];
    },
  });
}

/* ─── Board Sharing (Supabase JSON Snapshots) ─────────── */

export function getCurrentShareToken(): string | null {
  return localStorage.getItem("pzone_ipc_share_token");
}

export function getCurrentSignedUrl(): string | null {
  return localStorage.getItem("pzone_ipc_share_data");
}

export interface BoardShareOptions {
  projectCodes?: string[];
  clients?: string[];
  statuses?: string[];
  months?: string[];
  projectManagers?: string[];
  page?: "overview" | "projects" | "clients" | "status";
  projectManagerByCode?: Record<string, string | null | undefined>;
  includeCharts?: boolean;
  includeTables?: boolean;
  expiresAt?: string | null;
}

export interface BoardSnapshotPayload {
  version: 2;
  type: "ipc_board_snapshot";
  created_at: string;
  scope: Omit<BoardShareOptions, "projectManagerByCode">;
  invoices: Invoice[];
  collections: any[];
  cashFlowTransactions: any[];
  forecasts: any[];
}

export function buildShareUrl(token: string, page?: BoardShareOptions["page"]): string {
  const configuredBase = import.meta.env.VITE_PUBLIC_BASE_PATH || import.meta.env.BASE_URL || "/";
  const baseUrl = configuredBase.startsWith("http")
    ? configuredBase
    : `${window.location.origin}${configuredBase.startsWith("/") ? configuredBase : `/${configuredBase}`}`;
  const url = new URL(`ipc-board/${token}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (page && page !== "overview") url.searchParams.set("page", page);
  return url.toString();
}


function isBoardSnapshotPayload(value: any): value is BoardSnapshotPayload {
  return value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.invoices);
}

function normalizeBoardSnapshot(value: any): BoardSnapshotPayload {
  if (Array.isArray(value)) {
    return {
      version: 2,
      type: "ipc_board_snapshot",
      created_at: new Date().toISOString(),
      scope: { page: "overview", includeCharts: true, includeTables: true },
      invoices: value as Invoice[],
      collections: [],
      cashFlowTransactions: [],
      forecasts: [],
    };
  }

  if (isBoardSnapshotPayload(value)) {
    return {
      ...value,
      version: 2,
      type: "ipc_board_snapshot",
      collections: value.collections || [],
      cashFlowTransactions: value.cashFlowTransactions || [],
      forecasts: value.forecasts || [],
    };
  }

  return {
    version: 2,
    type: "ipc_board_snapshot",
    created_at: new Date().toISOString(),
    scope: { page: "overview", includeCharts: true, includeTables: true },
    invoices: [],
    collections: [],
    cashFlowTransactions: [],
    forecasts: [],
  };
}

async function fetchShareLedgerRows(projectCodes: Set<string>) {
  const safely = async (query: any) => {
    const { data, error } = await query;
    if (error) {
      if (/does not exist|schema cache|could not find/i.test(error.message || "")) return [];
      throw error;
    }
    return data || [];
  };

  const [collections, cashFlowTransactions, forecasts] = await Promise.all([
    safely((supabase as any).from("collection_transactions").select("*").neq("status", "reversed")),
    safely((supabase as any).from("cash_flow_transactions").select("*").neq("status", "reversed")),
    safely((supabase as any).from("cash_flow_forecasts").select("*").in("status", ["active", "draft"])),
  ]);

  const projectMatches = (code: string | null | undefined) => !code || projectCodes.has(code);

  return {
    collections: collections.filter((row: any) => projectMatches(row.project_code)),
    cashFlowTransactions: cashFlowTransactions.filter((row: any) => projectMatches(row.project_code)),
    forecasts: forecasts.filter((row: any) => projectMatches(row.project_code)),
  };
}

export function useGenerateShareToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ revoke = false, options }: { revoke?: boolean; options?: BoardShareOptions } = {}) => {
      if (revoke) {
        const activeToken = localStorage.getItem("pzone_ipc_share_token");
        if (activeToken) {
          const { error: revokeError } = await supabase.rpc("revoke_board_token", { input_token: activeToken });
          if (revokeError) {
            // Security: warn user that the link may still be active
            toast.warning("Revoke may have failed — link could still be active. " + revokeError.message);
          }
        }
        localStorage.removeItem("pzone_ipc_share_token");
        localStorage.removeItem("pzone_ipc_share_data");
        return null;
      }

      // Read local fallback data, then push it online when the signed-in user
      // has invoice write permissions. The shared board always reads the
      // Supabase-stored snapshot, not another user's browser localStorage.
      const localInvoices = getLocalInvoices();
      if (localInvoices.length > 0) {
        await syncLocalInvoicesToSupabase(localInvoices);
      }

      // Read Supabase after the sync attempt so the share source is online-first.
      let dbInvoices: Invoice[] = [];
      const { data: onlineData, error: onlineError } = await supabase
        .from("invoices").select("*").order("project_code");
      if (onlineError && !isTableMissingError(onlineError)) {
        toast.warning("Could not read online invoices — share link may contain incomplete data.");
      }
      dbInvoices = (onlineData || []) as Invoice[];

      // Merge both sources, then apply board-share scope.
      const merged = mergeInvoices(dbInvoices, localInvoices).filter((inv) => {
        if (options?.projectCodes?.length && !options.projectCodes.includes(inv.project_code)) return false;
        if (options?.clients?.length && !options.clients.includes(inv.client || "Unknown")) return false;
        if (options?.statuses?.length && !options.statuses.includes(inv.status || "")) return false;

        if (options?.months?.length) {
          const month = (inv.submitted_date || inv.approval_date || "").slice(0, 7);
          if (!month || !options.months.includes(month)) return false;
        }

        if (options?.projectManagers?.length) {
          const manager = options.projectManagerByCode?.[inv.project_code] || "Unassigned";
          if (!options.projectManagers.includes(manager)) return false;
        }

        return true;
      });

      if (merged.length === 0) {
        toast.error("No invoices to share — لا توجد مستخلصات");
        return null;
      }

      const { projectManagerByCode, ...publicScope } = options || {};
      const ledgerRows = await fetchShareLedgerRows(new Set(merged.map((inv) => inv.project_code)));
      const snapshotPayload: BoardSnapshotPayload = {
        version: 2,
        type: "ipc_board_snapshot",
        created_at: new Date().toISOString(),
        scope: {
          page: publicScope.page || "overview",
          projectCodes: publicScope.projectCodes,
          clients: publicScope.clients,
          statuses: publicScope.statuses,
          months: publicScope.months,
          projectManagers: publicScope.projectManagers,
          includeCharts: publicScope.includeCharts ?? true,
          includeTables: publicScope.includeTables ?? true,
          expiresAt: publicScope.expiresAt || null,
        },
        invoices: merged,
        collections: ledgerRows.collections,
        cashFlowTransactions: ledgerRows.cashFlowTransactions,
        forecasts: ledgerRows.forecasts,
      };

      // Use direct insert for share-token creation. This avoids RPC overload
      // ambiguity between json/jsonb variants while preserving online snapshots.
      const directToken = crypto.randomUUID();
      const directInsert = await supabase
        .from("board_share_tokens")
        .insert({
          token: directToken,
          snapshot_data: snapshotPayload,
          scope: snapshotPayload.scope,
          expires_at: publicScope.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        })
        .select("token")
        .single();

      if (directInsert.error) {
        throw new Error(
          "Online board sharing needs the board snapshot repair SQL. Run supabase/migrations/20260610_board_share_snapshot_repair.sql in Supabase, then generate the link again. Details: " +
          directInsert.error.message
        );
      }

      const token = directInsert.data?.token || directToken;

      if (!token) {
        throw new Error("Failed to generate share token from database");
      }

      localStorage.setItem("pzone_ipc_share_token", token);
      localStorage.setItem("pzone_ipc_share_data", "db_stored");
      localStorage.setItem("pzone_ipc_share_page", options?.page || "overview");

      toast.success(`Share link created with ${merged.length} invoices!`);
      return { token, signedUrl: token, page: options?.page || "overview" };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (e: any) => toast.error(`Share failed: ${e.message}`),
  });
}

export function useIPCBoardSnapshot(token: string | null | undefined) {
  return useQuery({
    queryKey: ["ipcBoardSnapshot", token],
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!token) return normalizeBoardSnapshot([]);

      const direct = await (supabase as any)
        .from("board_share_tokens")
        .select("snapshot_data, expires_at")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      const expiresAt = direct.data?.expires_at ? new Date(direct.data.expires_at).getTime() : null;
      if (!direct.error && direct.data?.snapshot_data && (!expiresAt || expiresAt > Date.now())) {
        return normalizeBoardSnapshot(direct.data.snapshot_data);
      }

      const directMessage = String(direct.error?.message || "");
      if (direct.error && !/does not exist|schema cache|Could not find|relation .* does not exist/i.test(directMessage)) {
        throw new Error(direct.error.message);
      }

      const snapshot = await supabase.rpc("get_board_snapshot", {
        input_token: token,
      });

      if (!snapshot.error) {
        return normalizeBoardSnapshot(snapshot.data);
      }

      const { data, error } = await supabase.rpc("get_board_invoices", {
        input_token: token,
      });

      if (!error && data) {
        return normalizeBoardSnapshot(data);
      }

      throw new Error(
        "No online board snapshot is available for this link. Run supabase/migrations/20260610_board_share_snapshot_repair.sql in Supabase and regenerate the share link.",
      );
    },
  });
}

export function useIPCBoardData(token: string | null | undefined) {
  const snapshot = useIPCBoardSnapshot(token);
  return {
    ...snapshot,
    data: snapshot.data?.invoices || [],
  };
}

// syncBoardSnapshotIfActive removed — was a no-op with no callers.

export function useNextInvoiceNumber(projectCode: string | null) {
  return useQuery({
    queryKey: ["nextInvoiceNumber", projectCode],
    enabled: !!projectCode,
    queryFn: async () => {
      if (!projectCode) return "1";
      // BUG-10 fix: Fetch all invoice numbers and sort numerically,
      // because Supabase sorts strings lexicographically ("9" > "10").
      const { data } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("project_code", projectCode);
      if (!data || data.length === 0) return "1";
      const nums = data.map((d: any) => parseInt(d.invoice_number || "0", 10)).filter((n) => !isNaN(n));
      const maxNum = Math.max(0, ...nums);
      return String(maxNum + 1);
    },
  });
}
