import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";

/* ─── Types ─────────────────────────────────────────────── */

export type CashFlowType = "in" | "out";

export type CashFlowCategory =
  | "client_collection"
  | "subcontractor"
  | "payroll"
  | "material"
  | "equipment"
  | "overhead"
  | "other";

export const CATEGORY_META: Record<CashFlowCategory, { label: string; labelAr: string; color: string; icon: string }> = {
  client_collection: { label: "Client Collection", labelAr: "تحصيلات عميل", color: "#22c55e", icon: "💰" },
  subcontractor:     { label: "Subcontractor",     labelAr: "مقاول باطن",    color: "#ef4444", icon: "🏗️" },
  payroll:           { label: "Payroll",            labelAr: "رواتب",         color: "#f59e0b", icon: "👥" },
  material:          { label: "Material",           labelAr: "مواد",          color: "#3b82f6", icon: "📦" },
  equipment:         { label: "Equipment",          labelAr: "معدات",         color: "#a855f7", icon: "⚙️" },
  overhead:          { label: "Overhead",           labelAr: "مصاريف إدارية", color: "#6366f1", icon: "🏢" },
  other:             { label: "Other",              labelAr: "أخرى",          color: "#64748b", icon: "📋" },
};

export interface CashFlowEntry {
  id: string;
  date: string;                  // YYYY-MM-DD
  amount: number;                // net cash out (actual payment)
  type: CashFlowType;
  category: CashFlowCategory;
  project_code: string | null;   // null = head office
  project_name?: string;
  description: string;
  reference?: string;            // invoice # or payroll period
  created_at: string;
  created_by?: string;
  // Subcontractor-specific fields
  subcontractor_name?: string;
  invoice_number?: string;
  gross_amount?: number;
  tax_amount?: number;
  total_deductions?: number;
}

/* ─── Monthly summary shape ─────────────────────────────── */
export interface MonthlyCashFlow {
  month: string;         // "Jan 25", "Feb 25"
  monthKey: string;      // "2025-01"
  cashIn: number;
  cashOut: number;
  net: number;
  cumulative: number;
  byCategory: Partial<Record<CashFlowCategory, number>>;
}

export interface ProjectCashSummary {
  project_code: string;
  project_name: string;
  cashIn: number;
  cashOut: number;
  net: number;
  burnRate: number;
  byCategory: Partial<Record<CashFlowCategory, number>>;
}

/* ─── Zustand Store ─────────────────────────────────────── */

interface CashFlowState {
  entries: CashFlowEntry[];
  addEntry: (entry: Omit<CashFlowEntry, "id" | "created_at">) => void;
  updateEntry: (id: string, updates: Partial<CashFlowEntry>) => void;
  deleteEntry: (id: string) => void;
  importCollections: (invoices: any[]) => void;
}

function generateId(): string {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useCashFlowStore = create<CashFlowState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const newEntry: CashFlowEntry = {
          ...entry,
          id: generateId(),
          created_at: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, newEntry] }));
      },

      updateEntry: (id, updates) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }));
      },

      deleteEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      /**
       * Sync client collections from IPC invoices → cash flow entries.
       * Only creates entries that don't already exist (idempotent).
       */
      importCollections: (invoices) => {
        const existing = get().entries;
        const existingRefs = new Set(
          existing
            .filter((e) => e.type === "in" && e.category === "client_collection")
            .map((e) => e.reference)
        );

        const newEntries: CashFlowEntry[] = [];

        for (const inv of invoices) {
          const collections = inv.total_collections || 0;
          if (collections <= 0) continue;

          const ref = `IPC-${inv.project_code}-${inv.invoice_number}`;
          if (existingRefs.has(ref)) continue;

          newEntries.push({
            id: generateId(),
            date: inv.collection_date || inv.approval_date || inv.submitted_date || new Date().toISOString().slice(0, 10),
            amount: collections,
            type: "in",
            category: "client_collection",
            project_code: inv.project_code,
            project_name: inv.project_name,
            description: `IPC #${inv.invoice_number} Collection — ${inv.client || ""}`,
            reference: ref,
            created_at: new Date().toISOString(),
          });
        }

        if (newEntries.length > 0) {
          set((s) => ({ entries: [...s.entries, ...newEntries] }));
        }
      },
    }),
    {
      name: "pzone_cashflow_v1",
    }
  )
);

/* ─── Derived Hooks ─────────────────────────────────────── */

/** All entries, optionally filtered by project */
export function useCashFlowEntries(projectCode?: string | null) {
  const entries = useCashFlowStore((s) => s.entries);
  return useMemo(() => {
    if (!projectCode) return entries;
    if (projectCode === "__headoffice__") return entries.filter((e) => e.project_code === null);
    return entries.filter((e) => e.project_code === projectCode);
  }, [entries, projectCode]);
}

/** Monthly trend data for the cash flow chart */
export function useMonthlyCashFlowTrend(projectCode?: string | null): MonthlyCashFlow[] {
  const entries = useCashFlowEntries(projectCode);

  return useMemo(() => {
    const map = new Map<string, MonthlyCashFlow>();

    for (const e of entries) {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" });

      if (!map.has(key)) {
        map.set(key, {
          month: label,
          monthKey: key,
          cashIn: 0,
          cashOut: 0,
          net: 0,
          cumulative: 0,
          byCategory: {},
        });
      }
      const m = map.get(key)!;
      if (e.type === "in") {
        m.cashIn += e.amount;
      } else {
        m.cashOut += e.amount;
        m.byCategory[e.category] = (m.byCategory[e.category] || 0) + e.amount;
      }
      m.net = m.cashIn - m.cashOut;
    }

    // Sort by key and calc cumulative
    const sorted = [...map.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    let cumulative = 0;
    for (const m of sorted) {
      cumulative += m.net;
      m.cumulative = cumulative;
    }

    return sorted;
  }, [entries]);
}

/** Per-project breakdown */
export function useProjectCashSummaries(): ProjectCashSummary[] {
  const entries = useCashFlowStore((s) => s.entries);

  return useMemo(() => {
    const map = new Map<string, ProjectCashSummary>();

    // Collect unique months for burn rate
    const allMonths = new Set<string>();

    for (const e of entries) {
      const code = e.project_code || "__headoffice__";
      const name = e.project_code ? (e.project_name || e.project_code) : "Head Office — المكتب الرئيسي";
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        allMonths.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }

      if (!map.has(code)) {
        map.set(code, {
          project_code: code,
          project_name: name,
          cashIn: 0,
          cashOut: 0,
          net: 0,
          burnRate: 0,
          byCategory: {},
        });
      }
      const p = map.get(code)!;
      if (e.type === "in") {
        p.cashIn += e.amount;
      } else {
        p.cashOut += e.amount;
        p.byCategory[e.category] = (p.byCategory[e.category] || 0) + e.amount;
      }
      p.net = p.cashIn - p.cashOut;
    }

    const monthCount = Math.max(1, allMonths.size);
    for (const p of map.values()) {
      p.burnRate = p.cashOut / monthCount;
    }

    return [...map.values()].sort((a, b) => b.cashOut - a.cashOut);
  }, [entries]);
}

/** Category totals for the donut chart */
export function useCategoryTotals() {
  const entries = useCashFlowStore((s) => s.entries);
  return useMemo(() => {
    const out: Partial<Record<CashFlowCategory, number>> = {};
    for (const e of entries) {
      if (e.type === "out") {
        out[e.category] = (out[e.category] || 0) + e.amount;
      }
    }
    return Object.entries(out).map(([k, v]) => ({
      category: k as CashFlowCategory,
      amount: v,
      ...CATEGORY_META[k as CashFlowCategory],
    }));
  }, [entries]);
}

/** Overall KPIs */
export function useCashFlowKPIs() {
  const entries = useCashFlowStore((s) => s.entries);
  return useMemo(() => {
    let totalIn = 0, totalOut = 0;
    let inCount = 0, outCount = 0;
    const months = new Set<string>();
    for (const e of entries) {
      if (e.type === "in") {
        totalIn += e.amount;
        inCount++;
      } else {
        totalOut += e.amount;
        outCount++;
      }
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    }
    const monthCount = Math.max(1, months.size);
    return {
      totalIn,
      totalOut,
      netCash: totalIn - totalOut,
      net: totalIn - totalOut,
      burnRate: totalOut / monthCount,
      inflowRate: totalIn / monthCount,
      entryCount: entries.length,
      inCount,
      outCount,
    };
  }, [entries]);
}
