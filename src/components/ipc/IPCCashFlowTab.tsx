import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell, ComposedChart, Legend, Brush,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, X, Building2, ChevronDown, ChevronUp, Wallet, Flame, AlertTriangle,
  Download, Filter, Calendar,
} from "lucide-react";
import {
  useCashFlowStore,
  CATEGORY_META,
  type CashFlowCategory,
  type CashFlowType,
  type ProjectCashSummary,
} from "@/stores/useCashFlowStore";
import { useChartZoom } from "@/hooks/useChartZoom";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import type { Invoice } from "@/hooks/useIPC";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Helpers ─────────────────────────────────────────────── */
const fmtMoney = (v: number) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
};

const fmtFull = (v: number) =>
  new Intl.NumberFormat("en-EG", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const getMonthKey = (date: string | null | undefined) => {
  if (!date) return null;
  return date.slice(0, 7);
};

const getMonthLabel = (monthKey: string) => {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

/* ─── Tooltip ─────────────────────────────────────────────── */
const CashTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 p-3 text-xs"
      style={{ background: "#0f172a", backdropFilter: "blur(12px)", minWidth: 180 }}>
      {label && <div className="text-slate-400 font-bold mb-2">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color || "#94a3b8" }}>{p.name}</span>
          <span className="text-white font-mono font-bold">
            {typeof p.value === "number" ? fmtFull(Math.abs(p.value)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ────────────────────────────────────────────── */
function KPICard({
  title, titleAr, value, subtitle, icon: Icon, color, trend,
}: {
  title: string; titleAr: string; value: string; subtitle?: string;
  icon: any; color: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
        style={{ background: color }} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{title}</p>
          <p className="text-[9px] text-slate-600 mb-2">{titleAr}</p>
          <p className="text-xl font-bold text-white font-mono">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1 mt-1">
              {trend === "up" && <ArrowUpRight size={12} className="text-emerald-400" />}
              {trend === "down" && <ArrowDownRight size={12} className="text-rose-400" />}
              <span className="text-[10px]" style={{ color: trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#94a3b8" }}>
                {subtitle}
              </span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Add Entry Modal ─────────────────────────────────────── */
function AddEntryModal({
  projects,
  onClose,
}: {
  projects: { code: string; name: string }[];
  onClose: () => void;
}) {
  const allEntries = useCashFlowStore((s) => s.entries);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",           // for non-subcontractor: the direct amount
    type: "out" as CashFlowType,
    category: "subcontractor" as CashFlowCategory,
    project_code: "" as string,
    description: "",
    reference: "",
    // Subcontractor-specific
    subcontractor_name: "",
    invoice_number: "",
    gross_amount: "",
    tax_amount: "",
    total_deductions: "",
    actual_cashout: "",   // the actual money leaving the bank this month
  });

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const isSubcon = form.type === "out" && form.category === "subcontractor";

  // Auto-calculate net = gross - tax - deductions
  const grossNum = parseFloat(form.gross_amount) || 0;
  const taxNum = parseFloat(form.tax_amount) || 0;
  const deductionNum = parseFloat(form.total_deductions) || 0;
  const netCalc = grossNum - taxNum - deductionNum;

  // Get unique subcontractor names from previous entries for typeahead
  const subconNames = useMemo(() => {
    const names = new Set<string>();
    allEntries.forEach((e) => {
      if (e.category === "subcontractor" && e.subcontractor_name) names.add(e.subcontractor_name);
    });
    return Array.from(names).sort();
  }, [allEntries]);

  // Filter subcontractor names based on input
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredNames = useMemo(() => {
    if (!form.subcontractor_name) return subconNames;
    return subconNames.filter((n) => n.toLowerCase().includes(form.subcontractor_name.toLowerCase()));
  }, [subconNames, form.subcontractor_name]);

  /** Persist a cash-flow row to Supabase. Finance truth must stay online for multi-user use. */
  const persistEntry = useCallback(async (row: {
    transaction_date: string;
    transaction_month: string;
    project_code: string | null;
    project_name: string;
    type: CashFlowType;
    category: string;
    amount: number;
    description: string;
    reference_no?: string;
    counterparty?: string;
  }) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("cash_flow_transactions").insert([{
        ...row,
        currency: "EGP",
        source_type: "manual",
        status: "posted",
      }]);
      if (error) throw error;
      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ["cash-flow-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["collection-transactions"] });
      toast.success("Cash flow entry saved");
    } catch (err: any) {
      console.error("[CashFlow] Supabase insert failed:", err?.message);
      toast.error(`Cash flow entry was not saved online: ${err?.message || "Unknown error"}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [queryClient]);

  const handleSubmit = async () => {
    const monthStr = form.date.slice(0, 7) + "-01"; // YYYY-MM-01
    const projectName = projects.find((p) => p.code === form.project_code)?.name || "";

    if (isSubcon) {
      const cashout = parseFloat(form.actual_cashout) || 0;
      if (cashout <= 0 || !form.project_code || !form.subcontractor_name) return;
      await persistEntry({
        transaction_date: form.date,
        transaction_month: monthStr,
        project_code: form.project_code || null,
        project_name: projectName,
        type: "out",
        category: "subcontractor",
        amount: cashout,
        description: `${form.subcontractor_name} — INV#${form.invoice_number || "N/A"}`,
        reference_no: form.invoice_number || undefined,
        counterparty: form.subcontractor_name,
      });
    } else {
      const amt = parseFloat(form.amount);
      if (isNaN(amt) || amt <= 0) return;
      await persistEntry({
        transaction_date: form.date,
        transaction_month: monthStr,
        project_code: form.project_code || null,
        project_name: projectName,
        type: form.type,
        category: form.category,
        amount: amt,
        description: form.description,
        reference_no: form.reference || undefined,
      });
    }
    onClose();
  };

  const categories = form.type === "out"
    ? Object.entries(CATEGORY_META).filter(([k]) => k !== "client_collection")
    : Object.entries(CATEGORY_META);

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-purple-500 outline-none";

  const canSubmit = isSubcon
    ? !!(form.project_code && form.subcontractor_name && (parseFloat(form.actual_cashout) || 0) > 0)
    : (parseFloat(form.amount) || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-purple-400" />
            Add Cash Flow Entry — إضافة حركة مالية
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            {(["in", "out"] as const).map((t) => (
              <button key={t} onClick={() => update("type", t)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  form.type === t
                    ? t === "in" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-white/5 text-slate-500 border border-white/5"
                }`}>
                {t === "in" ? "💰 Cash In — وارد" : "💸 Cash Out — صادر"}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Category الفئة</label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map(([key, meta]) => (
                <button key={key} onClick={() => update("category", key)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
                    form.category === key
                      ? "border text-white" : "bg-white/5 text-slate-500 border border-transparent hover:bg-white/10"
                  }`}
                  style={form.category === key ? { borderColor: meta.color + "55", background: meta.color + "15", color: meta.color } : {}}>
                  <span>{meta.icon}</span>
                  <span className="truncate">{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ════════ SUBCONTRACTOR-SPECIFIC FLOW ════════ */}
          {isSubcon ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4 rounded-2xl border border-rose-500/15 p-4"
              style={{ background: "rgba(239,68,68,0.03)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🏗️</span>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Subcontractor Invoice — فاتورة مقاول باطن
                </span>
              </div>

              {/* Step 1: Project (mandatory) */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                  1. Project المشروع <span className="text-rose-400">*</span>
                </label>
                <select value={form.project_code} onChange={(e) => update("project_code", e.target.value)}
                  className={`${inputCls} ${!form.project_code ? "border-rose-500/30" : "border-emerald-500/30"}`}>
                  <option value="">— Select Project اختر المشروع —</option>
                  {projects.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Subcontractor Name */}
              {form.project_code && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    2. Subcontractor المقاول <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={form.subcontractor_name}
                      onChange={(e) => { update("subcontractor_name", e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="e.g. Mohamed Hassan Contracting"
                      className={`${inputCls} font-sans ${!form.subcontractor_name ? "border-rose-500/30" : "border-emerald-500/30"}`}
                    />
                    {/* Autocomplete dropdown */}
                    {showSuggestions && filteredNames.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg bg-[#1a2540] border border-white/10 shadow-xl max-h-32 overflow-y-auto">
                        {filteredNames.map((name) => (
                          <button key={name} type="button"
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                            onMouseDown={() => { update("subcontractor_name", name); setShowSuggestions(false); }}>
                            🏗️ {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Invoice Details */}
              {form.project_code && form.subcontractor_name && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    3. Invoice Details — تفاصيل الفاتورة
                  </div>

                  {/* Invoice # + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Invoice # رقم الفاتورة</label>
                      <input value={form.invoice_number} onChange={(e) => update("invoice_number", e.target.value)}
                        placeholder="e.g. IPC-03"
                        className={`${inputCls} font-sans`} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Date التاريخ</label>
                      <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)}
                        className={inputCls} />
                    </div>
                  </div>

                  {/* Gross + Tax + Deductions */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Gross إجمالي</label>
                      <input type="number" placeholder="0.00" value={form.gross_amount}
                        onChange={(e) => update("gross_amount", e.target.value)}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Tax ضريبة</label>
                      <input type="number" placeholder="0.00" value={form.tax_amount}
                        onChange={(e) => update("tax_amount", e.target.value)}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Deductions استقطاعات</label>
                      <input type="number" placeholder="0.00" value={form.total_deductions}
                        onChange={(e) => update("total_deductions", e.target.value)}
                        className={inputCls} />
                    </div>
                  </div>

                  {/* Net (auto-calculated) + Actual Cash Out */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Net Amount صافي (auto)</label>
                      <div className={`${inputCls} cursor-not-allowed opacity-60`}>
                        {fmtFull(netCalc)}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-400 font-bold block mb-1">
                        Actual Cash Out المدفوع فعلياً <span className="text-rose-400">*</span>
                      </label>
                      <input type="number" placeholder="0.00" value={form.actual_cashout}
                        onChange={(e) => update("actual_cashout", e.target.value)}
                        className={`${inputCls} border-amber-500/30 focus:ring-amber-500`} />
                    </div>
                  </div>

                  {/* Live Summary */}
                  {grossNum > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl bg-slate-800/40 border border-white/5 p-3 space-y-1.5"
                    >
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                        Invoice Summary — ملخص الفاتورة
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Gross إجمالي</span>
                        <span className="text-white font-mono">{fmtFull(grossNum)}</span>
                      </div>
                      {taxNum > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">(-) Tax ضريبة</span>
                          <span className="text-rose-400 font-mono">-{fmtFull(taxNum)}</span>
                        </div>
                      )}
                      {deductionNum > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">(-) Deductions استقطاعات</span>
                          <span className="text-rose-400 font-mono">-{fmtFull(deductionNum)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px] border-t border-white/5 pt-1.5">
                        <span className="text-white font-bold">Net صافي</span>
                        <span className="text-emerald-400 font-mono font-bold">{fmtFull(netCalc)}</span>
                      </div>
                      {(parseFloat(form.actual_cashout) || 0) > 0 && (
                        <div className="flex justify-between text-[11px] border-t border-white/5 pt-1.5">
                          <span className="text-amber-400 font-bold">💸 Actual Cash Out</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {fmtFull(parseFloat(form.actual_cashout) || 0)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>

          ) : (
            /* ════════ GENERIC (NON-SUBCONTRACTOR) FLOW ════════ */
            <>
              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Date التاريخ</label>
                  <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Amount المبلغ</label>
                  <input type="number" placeholder="0.00" value={form.amount} onChange={(e) => update("amount", e.target.value)}
                    className={inputCls} />
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Project المشروع</label>
                <select value={form.project_code} onChange={(e) => update("project_code", e.target.value)}
                  className={`${inputCls} font-sans`}>
                  <option value="">🏢 Head Office — المكتب الرئيسي</option>
                  {projects.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Description + Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Description الوصف</label>
                  <input value={form.description} onChange={(e) => update("description", e.target.value)}
                    placeholder="e.g. Payroll May 2026"
                    className={`${inputCls} font-sans`} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Reference # المرجع</label>
                  <input value={form.reference} onChange={(e) => update("reference", e.target.value)}
                    placeholder="Invoice # or period"
                    className={`${inputCls} font-sans`} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          {isSubcon && form.project_code && form.subcontractor_name && (
            <div className="text-[10px] text-slate-500">
              🏗️ <span className="text-white font-bold">{form.subcontractor_name}</span>
              <span className="text-slate-600"> → </span>
              <span className="text-blue-400">{form.project_code}</span>
            </div>
          )}
          {!isSubcon && <div />}
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition">
              Cancel
            </button>
            <button onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              {saving ? "Saving..." : "Add Entry إضافة"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Cash Flow Tab ──────────────────────────────────── */
export function IPCCashFlowTab({
  invoices,
  projects,
}: {
  invoices: Invoice[];
  projects: { project_code: string; project_name: string }[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const financial = useFinancialSnapshot();

  const isVisibleProjectCode = (code: string | null | undefined) => {
    if (projectFilter === "all") return true;
    if (projectFilter === "headoffice") return !code;
    return code === projectFilter;
  };

  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      month: string;
      monthKey: string;
      cashIn: number;
      cashOut: number;
      forecastIn: number;
      forecastOut: number;
      net: number;
      cumulative: number;
      forecastCumulative: number;
    }>();

    const ensure = (key: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const row = {
        month: getMonthLabel(key),
        monthKey: key,
        cashIn: 0,
        cashOut: 0,
        forecastIn: 0,
        forecastOut: 0,
        net: 0,
        cumulative: 0,
        forecastCumulative: 0,
      };
      map.set(key, row);
      return row;
    };

    financial.collections.forEach((tx) => {
      if (!isVisibleProjectCode(tx.project_code)) return;
      const key = getMonthKey(tx.collection_month || tx.collection_date);
      if (key) ensure(key).cashIn += tx.amount;
    });

    financial.cashFlowTransactions.forEach((tx) => {
      if (!isVisibleProjectCode(tx.project_code)) return;
      const key = getMonthKey(tx.transaction_month || tx.transaction_date);
      if (!key) return;
      const row = ensure(key);
      if (tx.type === "in") row.cashIn += tx.amount;
      else row.cashOut += tx.amount;
    });

    financial.forecasts.forEach((forecast) => {
      if (!isVisibleProjectCode(forecast.project_code)) return;
      const key = getMonthKey(forecast.forecast_month || forecast.forecast_date);
      if (!key) return;
      const row = ensure(key);
      if (forecast.type === "in") row.forecastIn += forecast.amount * (forecast.probability_pct / 100);
      else row.forecastOut += forecast.amount * (forecast.probability_pct / 100);
    });

    let cumulative = 0;
    let forecastCumulative = 0;
    return Array.from(map.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((row) => {
        const net = row.cashIn - row.cashOut;
        const forecastNet = row.forecastIn - row.forecastOut;
        cumulative += net;
        forecastCumulative += net + forecastNet;
        return { ...row, net, cumulative, forecastCumulative };
      });
  }, [financial.collections, financial.cashFlowTransactions, financial.forecasts, projectFilter]);

  const projectSummaries = useMemo<ProjectCashSummary[]>(() => {
    const months = new Set(financial.monthly.map((m) => m.monthKey)).size || 1;
    const byProject = new Map<string, ProjectCashSummary>();

    financial.projects.forEach((project) => {
      if (!isVisibleProjectCode(project.project_code)) return;
      byProject.set(project.project_code, {
        project_code: project.project_code,
        project_name: project.project_name,
        cashIn: project.actual_collected,
        cashOut: project.actual_cash_out,
        net: project.actual_collected - project.actual_cash_out,
        burnRate: project.actual_cash_out / months,
        byCategory: {},
      });
    });

    financial.cashFlowTransactions.forEach((tx) => {
      if (tx.type !== "out" || !isVisibleProjectCode(tx.project_code)) return;
      const code = tx.project_code || "__headoffice__";
      const current = byProject.get(code) || {
        project_code: code,
        project_name: tx.project_name || "Head Office",
        cashIn: 0,
        cashOut: 0,
        net: 0,
        burnRate: 0,
        byCategory: {},
      };
      if (code === "__headoffice__" || !byProject.has(code)) current.cashOut += tx.amount;
      current.net = current.cashIn - current.cashOut;
      current.burnRate = current.cashOut / months;
      const category = ((tx.category || "other") in CATEGORY_META ? tx.category : "other") as CashFlowCategory;
      current.byCategory[category] = (current.byCategory[category] || 0) + tx.amount;
      byProject.set(code, current);
    });

    return Array.from(byProject.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [financial.projects, financial.cashFlowTransactions, financial.monthly, projectFilter]);

  const categoryData = useMemo(() => {
    const totals = new Map<CashFlowCategory, number>();
    financial.cashFlowTransactions.forEach((tx) => {
      if (tx.type !== "out" || !isVisibleProjectCode(tx.project_code)) return;
      const category = ((tx.category || "other") in CATEGORY_META ? tx.category : "other") as CashFlowCategory;
      totals.set(category, (totals.get(category) || 0) + tx.amount);
    });
    return Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        ...CATEGORY_META[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [financial.cashFlowTransactions, projectFilter]);

  const kpis = useMemo(() => {
    const totalIn = monthlyData.reduce((sum, row) => sum + row.cashIn, 0);
    const totalOut = monthlyData.reduce((sum, row) => sum + row.cashOut, 0);
    const months = Math.max(monthlyData.length, 1);
    return {
      totalIn,
      totalOut,
      netCash: totalIn - totalOut,
      inflowRate: totalIn / months,
      burnRate: totalOut / months,
      entryCount: financial.collections.filter((tx) => isVisibleProjectCode(tx.project_code)).length +
        financial.cashFlowTransactions.filter((tx) => isVisibleProjectCode(tx.project_code)).length,
    };
  }, [monthlyData, financial.collections, financial.cashFlowTransactions, projectFilter]);

  // Prep chart data — negative for outflows
  const chartData = useMemo(() =>
    monthlyData.map((m) => ({
      month: m.month,
      "Cash In": m.cashIn,
      "Cash Out": -m.cashOut,
      "Net Position": m.cumulative,
      "Forecast Net": m.forecastCumulative,
    })),
    [monthlyData]
  );

  const projectList = useMemo(() =>
    projects.map((p) => ({ code: p.project_code, name: p.project_name })),
    [projects]
  );

  // Zoom hook for main chart
  const mainZoom = useChartZoom(chartData.length);

  return (
    <div className="space-y-6">

      {/* ══════ KPI Cards ══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Cash In (YTD)" titleAr="إجمالي الواردات"
          value={`EGP ${fmtMoney(kpis.totalIn)}`}
          subtitle={`${fmtMoney(kpis.inflowRate)}/mo avg`}
          icon={TrendingUp} color="#22c55e" trend="up"
        />
        <KPICard
          title="Total Cash Out (YTD)" titleAr="إجمالي الصادرات"
          value={`EGP ${fmtMoney(kpis.totalOut)}`}
          subtitle={`${fmtMoney(kpis.burnRate)}/mo burn`}
          icon={TrendingDown} color="#ef4444" trend="down"
        />
        <KPICard
          title="Net Cash Position" titleAr="صافي الموقف النقدي"
          value={`EGP ${fmtMoney(kpis.netCash)}`}
          subtitle={kpis.netCash >= 0 ? "Positive" : "⚠️ Negative"}
          icon={Wallet} color={kpis.netCash >= 0 ? "#667eea" : "#ef4444"}
          trend={kpis.netCash >= 0 ? "up" : "down"}
        />
        <KPICard
          title="Monthly Burn Rate" titleAr="معدل الحرق الشهري"
          value={`EGP ${fmtMoney(kpis.burnRate)}`}
          subtitle={`${kpis.entryCount} transactions`}
          icon={Flame} color="#f59e0b" trend="neutral"
        />
      </div>

      {/* ══════ Toolbar ══════ */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        {/* Project filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-purple-500 outline-none">
            <option value="all">All Projects — جميع المشاريع</option>
            <option value="headoffice">🏢 Head Office — المكتب الرئيسي</option>
            {projects.map((p) => (
              <option key={p.project_code} value={p.project_code}>{p.project_code} — {p.project_name}</option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/20"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          <Plus size={16} />
          Add Entry إضافة حركة
        </button>
      </motion.div>

      {/* ══════ Main Cash Flow Chart ══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/[0.06] p-5"
        style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
      >
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <DollarSign size={15} className="text-emerald-400" />
          Cash Flow Overview — التدفقات النقدية
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">
          Green bars = money in (client collections) · Red bars = money out (subcontractors, payroll, etc.) · Line = cumulative net position
        </p>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
            <AlertTriangle size={24} className="text-slate-600" />
            <span>No cash flow data yet — add entries or import IPC collections</span>
          </div>
        ) : (
          <div {...mainZoom.containerProps} className="relative">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="cashInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="cashOutGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
                <Tooltip content={<CashTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Cash In" fill="url(#cashInGrad)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cash Out" fill="url(#cashOutGrad)" radius={[0, 0, 4, 4]} />
                <Line type="monotone" dataKey="Net Position" name="Cumulative Net"
                  stroke="#667eea" strokeWidth={2.5} dot={{ fill: "#667eea", r: 4 }}
                  activeDot={{ r: 6, fill: "#667eea", stroke: "#fff", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="Forecast Net" name="Actual + Forecast Net"
                  stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Brush
                  dataKey="month"
                  {...mainZoom.brushProps}
                  height={22}
                  tickFormatter={() => ""}
                  stroke="#667eea44"
                  fill="#0f172a"
                  fillOpacity={0.95}
                />
              </ComposedChart>
            </ResponsiveContainer>
            {mainZoom.isZoomed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute top-2 right-2">
                <button onClick={mainZoom.resetZoom}
                  className="text-[9px] font-mono font-bold text-purple-200 bg-purple-500/15 border border-purple-500/25 backdrop-blur-md rounded-full px-2 py-0.5">
                  🔍 {mainZoom.zoomLevel.toFixed(1)}x — Reset
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══════ Bottom Row: Project Table + Category Donut ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Per-Project Cash Flow Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-2xl border border-white/[0.06] p-5"
          style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
        >
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-blue-400" />
            Cash Flow by Project — التدفق حسب المشروع
          </h3>

          {projectSummaries.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No data yet</div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 text-[9px] text-slate-500 uppercase tracking-wider px-3 py-2 border-b border-white/5">
                <span className="col-span-2">Project</span>
                <span className="text-right">Cash In</span>
                <span className="text-right">Cash Out</span>
                <span className="text-right">Net</span>
                <span className="text-right">Burn/Mo</span>
              </div>

              {projectSummaries.map((p) => {
                const isExpanded = expandedProject === p.project_code;
                const netColor = p.net >= 0 ? "#22c55e" : "#ef4444";
                return (
                  <div key={p.project_code}>
                    <button
                      onClick={() => setExpandedProject(isExpanded ? null : p.project_code)}
                      className="w-full grid grid-cols-6 gap-2 items-center text-[11px] px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="col-span-2 flex items-center gap-2 text-left">
                        {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                        <span className="font-bold text-white truncate">
                          {p.project_code === "__headoffice__" ? "🏢 Head Office" : p.project_code}
                        </span>
                      </span>
                      <span className="text-right font-mono text-emerald-400">{fmtMoney(p.cashIn)}</span>
                      <span className="text-right font-mono text-rose-400">{fmtMoney(p.cashOut)}</span>
                      <span className="text-right font-mono font-bold" style={{ color: netColor }}>{fmtMoney(p.net)}</span>
                      <span className="text-right font-mono text-amber-400">{fmtMoney(p.burnRate)}</span>
                    </button>

                    {/* Expanded: category breakdown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-8 mr-3 mb-2 space-y-1">
                            <p className="text-[9px] text-slate-600 mb-1">
                              {p.project_code === "__headoffice__" ? "المكتب الرئيسي" : p.project_name}
                            </p>
                            {Object.entries(p.byCategory).map(([cat, amt]) => {
                              const meta = CATEGORY_META[cat as CashFlowCategory];
                              return (
                                <div key={cat} className="flex items-center justify-between text-[10px]">
                                  <span className="flex items-center gap-1.5">
                                    <span>{meta.icon}</span>
                                    <span className="text-slate-400">{meta.label}</span>
                                  </span>
                                  <span className="font-mono" style={{ color: meta.color }}>
                                    EGP {fmtFull(amt)}
                                  </span>
                                </div>
                              );
                            })}
                            {/* Net bar */}
                            <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.min(100, p.cashIn > 0 ? (p.net / p.cashIn) * 100 : 0)}%`,
                                background: p.net >= 0
                                  ? "linear-gradient(90deg, #22c55e66, #22c55e)"
                                  : "linear-gradient(90deg, #ef444466, #ef4444)",
                              }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Category Breakdown Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/[0.06] p-5"
          style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
        >
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Flame size={15} className="text-amber-400" />
            Expense Breakdown — توزيع المصروفات
          </h3>

          {categoryData.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-12">No expenses yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="label"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`EGP ${fmtFull(value)}`, name]}
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {categoryData.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      <span>{c.icon}</span>
                      <span className="text-slate-400">{c.label}</span>
                    </span>
                    <span className="font-mono text-white font-medium">EGP {fmtFull(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

      </div>

      {/* ══════ Add Entry Modal ══════ */}
      <AnimatePresence>
        {showAddModal && (
          <AddEntryModal
            projects={projectList}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
