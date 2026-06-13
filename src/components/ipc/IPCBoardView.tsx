import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Gauge,
  Percent,
  RotateCcw,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { fmtCompact, fmtNum, fmtPercent } from "@/lib/utils";
import { type Invoice, useIPCBoardSnapshot } from "@/hooks/useIPC";
import { computeFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useMonthlyOverrides } from "@/hooks/useMonthlyOverrides";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777", "#0891b2"];
const AGING_COLORS = ["#16a34a", "#d97706", "#ea580c", "#dc2626"];

const fmtMoney = (value: number) => fmtCompact(value || 0);
const fmtFull = (value: number) => fmtNum(value || 0);
const fmtPct = (value: number) => fmtPercent(Number.isFinite(value) ? value : 0);

const statusLabel = (status?: string | null) => {
  const raw = status || "Unknown";
  if (raw.includes("معتمد")) return "Approved";
  if (raw.includes("تحت")) return "Pending";
  if (raw.includes("مراج")) return "Under Review";
  if (raw.includes("ختام")) return "Final";
  if (raw.includes("رفض") || raw.includes("مرفوض")) return "Rejected";
  return raw;
};

const statusColor = (status?: string | null) => {
  const label = statusLabel(status);
  if (label === "Approved") return "#16a34a";
  if (label === "Pending") return "#d97706";
  if (label === "Under Review") return "#2563eb";
  if (label === "Final") return "#7c3aed";
  if (label === "Rejected") return "#dc2626";
  return "#64748b";
};

const invoiceRank = (invoiceNumber?: string | null) => {
  const match = String(invoiceNumber || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const invoiceMonth = (invoice: Invoice) => {
  const raw = invoice.submitted_date || invoice.approval_date || invoice.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  return { key, label };
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white/80 p-3.5 text-xs shadow-lg backdrop-blur-xl" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
      {label && <div className="mb-2 font-bold text-slate-700">{label}</div>}
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-5 py-0.5">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} /><span className="text-slate-600">{item.name}</span></span>
          <span className="font-mono font-bold text-slate-900">
            {typeof item.value === "number" ? fmtFull(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function getTone(score: number) {
  if (score >= 80) return { label: "Strong", color: "#16a34a", bg: "#f0fdf4" };
  if (score >= 60) return { label: "Watch", color: "#d97706", bg: "#fffbeb" };
  return { label: "Critical", color: "#dc2626", bg: "#fef2f2" };
}

function KPI({
  icon: Icon,
  label,
  labelAr,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  labelAr: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: `linear-gradient(135deg, white 0%, ${color}08 100%)`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 8px 24px ${color}12, inset 0 1px 0 rgba(255,255,255,0.9)`,
        border: `1px solid ${color}18`,
      }}
    >
      {/* Decorative corner accent */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.12]" style={{ background: color }} />
      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}14`, boxShadow: `0 4px 12px ${color}20` }}>
          <Icon size={19} style={{ color }} />
        </div>
        <div className="mb-0.5 text-2xl font-black tracking-tight text-slate-900">{value}</div>
        <div className="text-[11px] font-semibold text-slate-600">
          {label} <span className="font-normal text-slate-400">/ {labelAr}</span>
        </div>
        {sub && <div className="mt-1.5 text-[10px] font-mono text-slate-400">{sub}</div>}
      </div>
    </motion.div>
  );
}

function ChartCard({ id, title, subtitle, icon: Icon, color, children, delay = 0.3, onReset }: {
  id?: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  delay?: number;
  onReset?: () => void;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 6px 24px ${color}08`, border: `1px solid ${color}15` }}
    >
      {/* Card header with accent gradient */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute left-0 top-0 h-full w-1 rounded-r-full" style={{ background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}12` }}>
              <Icon size={14} style={{ color }} />
            </div>
            {title}
          </h3>
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all hover:shadow-sm"
              style={{ color, background: `${color}0a`, border: `1px solid ${color}25` }}
            >
              <RotateCcw size={10} />
              Reset filter
            </button>
          )}
        </div>
        {subtitle && <p className="mt-1 pl-[38px] text-[10px] text-slate-500">{subtitle}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  );
}

const ALL_VALUE = "__all__";

type BoardProjectSort = "contract" | "outstanding" | "collection";

interface BoardSlicerState {
  projectCode: string;
  client: string;
  sector: string;
  status: string;
  monthFrom: string;
  monthTo: string;
  projectSort: BoardProjectSort;
}

interface SlicerOption {
  value: string;
  label: string;
}

const DEFAULT_SLICERS: BoardSlicerState = {
  projectCode: ALL_VALUE,
  client: ALL_VALUE,
  sector: ALL_VALUE,
  status: ALL_VALUE,
  monthFrom: ALL_VALUE,
  monthTo: ALL_VALUE,
  projectSort: "outstanding",
};

type DrillSource = "month" | "sector" | "client" | "status" | null;

function DrillDownBanner({ source, label, onClear }: { source: DrillSource; label: string; onClear: () => void }) {
  if (!source) return null;
  const colorMap: Record<string, string> = { month: "#2563eb", sector: "#7c3aed", client: "#d97706", status: "#16a34a" };
  const iconLabel: Record<string, string> = { month: "Month", sector: "Sector", client: "Client", status: "Status" };
  const accent = colorMap[source] || "#2563eb";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between gap-3 rounded-xl px-5 py-3"
      style={{ background: `${accent}08`, border: `1px solid ${accent}22` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: accent }}>
          <Filter size={13} />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
            Drill-Down Active — {iconLabel[source]}
          </div>
          <div className="text-xs font-semibold text-slate-700">
            Filtered by: <span className="font-black" style={{ color: accent }}>{label}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:shadow-sm"
        style={{ color: accent, background: `${accent}10`, border: `1px solid ${accent}30` }}
      >
        <X size={12} />
        Clear drill-down
      </button>
    </motion.div>
  );
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function formatMonthOption(key: string) {
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function invoiceMonthKey(invoice: Invoice) {
  return invoiceMonth(invoice)?.key || null;
}

function selectClassName() {
  return "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:shadow-md";
}

function SlicerSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: SlicerOption[];
  allLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{label}</span>
      <select className={selectClassName()} value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel && <option value={ALL_VALUE}>{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SharedBoardSlicers({
  slicers,
  options,
  activeCount,
  filteredCount,
  totalCount,
  onChange,
  onReset,
}: {
  slicers: BoardSlicerState;
  options: {
    projects: SlicerOption[];
    clients: SlicerOption[];
    sectors: SlicerOption[];
    statuses: SlicerOption[];
    months: SlicerOption[];
  };
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onChange: <K extends keyof BoardSlicerState>(key: K, value: BoardSlicerState[K]) => void;
  onReset: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #2563eb12, #2563eb08)" }}>
              <Filter size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Shared Filters / Slicers</h2>
              <p className="text-[11px] text-slate-500">Read-only filters inside the shared snapshot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl px-3.5 py-2 text-[11px] font-bold text-blue-700" style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe" }}>
              {filteredCount} / {totalCount} IPCs
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0 && slicers.projectSort === DEFAULT_SLICERS.projectSort}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        <SlicerSelect label="Project" value={slicers.projectCode} options={options.projects} allLabel="All projects" onChange={(value) => onChange("projectCode", value)} />
        <SlicerSelect label="Client" value={slicers.client} options={options.clients} allLabel="All clients" onChange={(value) => onChange("client", value)} />
        <SlicerSelect label="Sector" value={slicers.sector} options={options.sectors} allLabel="All sectors" onChange={(value) => onChange("sector", value)} />
        <SlicerSelect label="Status" value={slicers.status} options={options.statuses} allLabel="All statuses" onChange={(value) => onChange("status", value)} />
        <SlicerSelect label="Month from" value={slicers.monthFrom} options={options.months} allLabel="Start" onChange={(value) => onChange("monthFrom", value)} />
        <SlicerSelect label="Month to" value={slicers.monthTo} options={options.months} allLabel="End" onChange={(value) => onChange("monthTo", value)} />
        <SlicerSelect
          label="Project ranking"
          value={slicers.projectSort}
          options={[
            { value: "outstanding", label: "Outstanding first" },
            { value: "contract", label: "Contract value" },
            { value: "collection", label: "Collection gap" },
          ]}
          onChange={(value) => onChange("projectSort", value as BoardProjectSort)}
        />
        <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", border: "1px solid #e2e8f0" }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Active slicers</div>
          <div className="mt-1 text-lg font-black text-slate-900">{activeCount}</div>
          <div className="text-[10px] text-slate-400">Applied to KPIs, charts, alerts, and tables</div>
        </div>
      </div>
    </section>
  );
}

function ExecutiveBrief({
  score,
  collected,
  outstanding,
  unbilled,
  approvalRate,
  collectionEfficiency,
  highestOutstanding,
  largestGap,
}: {
  score: number;
  collected: number;
  outstanding: number;
  unbilled: number;
  approvalRate: number;
  collectionEfficiency: number;
  highestOutstanding?: { label: string; value: number };
  largestGap?: { label: string; value: number };
}) {
  const tone = getTone(score);
  const rows = [
    { label: "Approved collection efficiency", value: fmtPct(collectionEfficiency), color: collectionEfficiency >= 0.75 ? "#16a34a" : "#d97706" },
    { label: "Approval conversion", value: fmtPct(approvalRate), color: approvalRate >= 0.75 ? "#16a34a" : "#dc2626" },
    { label: "Outstanding receivable", value: fmtMoney(outstanding), color: outstanding > collected * 0.5 ? "#dc2626" : "#d97706" },
    { label: "Remaining to bill", value: fmtMoney(unbilled), color: "#2563eb" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]"
    >
      {/* Health Score — Dark premium card */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "linear-gradient(145deg, #0f172a, #1e293b)", boxShadow: "0 8px 32px rgba(15,23,42,0.25)" }}
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: tone.color }} />
        <div className="relative">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Executive Health</div>
          <div className="mb-5 flex items-end justify-between">
            <div className="text-4xl font-black text-white">{score}<span className="ml-1 text-lg text-slate-500">/100</span></div>
            <div className="rounded-lg px-3 py-1.5 text-xs font-black" style={{ color: tone.color, background: `${tone.color}18`, border: `1px solid ${tone.color}40` }}>
              {tone.label}
            </div>
          </div>
          <div className="relative mb-5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${tone.color}66, ${tone.color})`, boxShadow: `0 0 12px ${tone.color}60` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              { label: "Cash In", val: fmtMoney(collected), clr: "#d97706", bg: "rgba(217,119,6,0.1)" },
              { label: "Open AR", val: fmtMoney(outstanding), clr: "#dc2626", bg: "rgba(220,38,38,0.1)" },
              { label: "Unbilled", val: fmtMoney(unbilled), clr: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-2.5" style={{ background: item.bg }}>
                <div className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</div>
                <div className="font-mono text-xs font-black" style={{ color: item.clr }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Board Brief — Editorial card */}
      <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Board Brief — ملخص تنفيذي</div>
              <div className="text-[11px] text-slate-500">Cash, approvals, receivables, and immediate risk signals</div>
            </div>
            <div className="hidden rounded-xl border border-red-100 bg-red-50/50 px-3.5 py-2 text-right md:block">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Highest Outstanding</div>
              <div className="font-mono text-xs font-bold text-red-600">{highestOutstanding ? `${highestOutstanding.label} / ${fmtMoney(highestOutstanding.value)}` : "-"}</div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50" style={{ borderLeft: `3px solid ${row.color}` }}>
                <span className="text-xs font-medium text-slate-600">{row.label}</span>
                <span className="font-mono text-sm font-black" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #fef2f2, #fff1f2)", border: "1px solid #fecdd3" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">Largest Approval Gap</div>
              <div className="mt-1.5 font-mono text-xs font-black text-slate-900">{largestGap ? `${largestGap.label} / ${fmtPct(largestGap.value)}` : "-"}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Board Focus</div>
              <div className="mt-1.5 text-xs font-semibold text-slate-700">{outstanding > collected ? "Collections pressure is the leading risk" : "Cash collection is tracking ahead of risk"}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ProjectPanel({ projectCode, invoices, onClose }: { projectCode: string | null; invoices: Invoice[]; onClose: () => void }) {
  const projectInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.project_code === projectCode)
      .sort((a, b) => invoiceRank(a.invoice_number) - invoiceRank(b.invoice_number));
  }, [invoices, projectCode]);

  const latest = projectInvoices[projectInvoices.length - 1];
  const projectName = latest?.project_name || "";
  const client = latest?.client || "Unknown";
  const sector = latest?.sector || "-";
  const contractValue = latest?.contract_value || 0;
  const submitted = latest?.work_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.work_current || 0), 0);
  const approved = latest?.approved_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.approved_current || 0), 0);
  const approvedNet = latest?.approved_net_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.approved_net_current || 0), 0);
  const collected = projectInvoices.reduce((sum, invoice) => sum + (invoice.total_collections || 0), 0);
  const gapPct = submitted > 0 ? Math.max((submitted - approved) / submitted, 0) : 0;

  const curveData = useMemo(() => {
    return projectInvoices.map((invoice) => ({
      name: `IPC #${invoice.invoice_number || "-"}`,
      Submitted: invoice.work_total || 0,
      Approved: invoice.approved_total || 0,
      Collected: invoice.total_collections || 0,
    }));
  }, [projectInvoices]);

  const deductionData = useMemo(() => {
    const map = new Map<string, number>();
    projectInvoices.forEach((invoice) => {
      (invoice.deductions_breakdown || []).forEach((item) => {
        map.set(item.name || "Other", (map.get(item.name || "Other") || 0) + (item.amount || 0));
      });
      (invoice.approved_deductions_breakdown || []).forEach((item) => {
        map.set(`Approved ${item.name || "Deduction"}`, (map.get(`Approved ${item.name || "Deduction"}`) || 0) + (item.amount || 0));
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter((item) => item.value > 0);
  }, [projectInvoices]);

  return (
    <AnimatePresence>
      {projectCode && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{projectCode}</h2>
                  <p className="text-xs text-slate-500">{projectName}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["Client", client, "#2563eb"],
                  ["Sector", sector, "#7c3aed"],
                  ["Contract Value", fmtMoney(contractValue), "#16a34a"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[10px] text-slate-500">{label}</div>
                    <div className="text-sm font-black" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KPI icon={FileSpreadsheet} label="Total Submitted" labelAr="المقدم" value={fmtMoney(submitted)} color="#2563eb" delay={0} />
                <KPI icon={Check} label="Total Approved" labelAr="المعتمد" value={fmtMoney(approved)} color="#16a34a" delay={0.03} />
                <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(collected)} color="#d97706" delay={0.06} />
                <KPI icon={AlertTriangle} label="Approval Gap" labelAr="فجوة الاعتماد" value={fmtPct(gapPct)} color={gapPct > 0.25 ? "#dc2626" : "#d97706"} delay={0.09} />
              </div>

              <ChartCard title="Cumulative IPC Curve - منحنى المستخلصات" icon={TrendingUp} color="#7c3aed">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Submitted" stroke="#2563eb" fill="#2563eb18" strokeWidth={2} />
                    <Area type="monotone" dataKey="Approved" stroke="#16a34a" fill="#16a34a18" strokeWidth={2} />
                    <Area type="monotone" dataKey="Collected" stroke="#d97706" fill="#d9770618" strokeWidth={2} strokeDasharray="4 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`IPC History - سجل المستخلصات (${projectInvoices.length})`} icon={Wallet} color="#7c3aed">
                <div className="space-y-3">
                  {projectInvoices.map((invoice, index) => {
                    const color = statusColor(invoice.status);
                    return (
                      <div key={`${invoice.id}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">IPC #{invoice.invoice_number || "-"}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color, background: `${color}14` }}>
                              {statusLabel(invoice.status)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{invoice.submitted_date || invoice.approval_date || "-"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-[10px] text-slate-500">Submitted</div>
                            <div className="font-mono text-xs font-black text-blue-600">{fmtMoney(invoice.work_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500">Approved</div>
                            <div className="font-mono text-xs font-black text-green-600">{fmtMoney(invoice.approved_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500">Collected</div>
                            <div className="font-mono text-xs font-black text-amber-600">{fmtMoney(invoice.total_collections || 0)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              {deductionData.length > 0 && (
                <ChartCard title="Deduction Breakdown - تفصيل الاستقطاعات" icon={Percent} color="#dc2626">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie data={deductionData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={74} paddingAngle={3}>
                          {deductionData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {deductionData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                            <span className="truncate text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{fmtMoney(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface Props {
  token: string;
  signedUrl?: string | null;
  initialPage?: string | null;
  initialOverrides?: Record<string, number>;
}

export function IPCBoardView({ token, signedUrl, initialPage, initialOverrides }: Props) {
  const { data: boardSnapshot, isLoading, error } = useIPCBoardSnapshot(token);
  const allInvoices = boardSnapshot?.invoices || [];
  const [slicers, setSlicers] = useState<BoardSlicerState>(DEFAULT_SLICERS);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [drillSource, setDrillSource] = useState<DrillSource>(null);
  const [drillLabel, setDrillLabel] = useState("");

  const drillDown = useCallback((source: DrillSource, key: keyof BoardSlicerState, value: string, label: string) => {
    setDrillSource(source);
    setDrillLabel(label);
    setSelectedProject(null);
    setSlicers((prev) => ({ ...DEFAULT_SLICERS, [key]: value }));
  }, []);

  const clearDrill = useCallback(() => {
    setDrillSource(null);
    setDrillLabel("");
    setSelectedProject(null);
    setSlicers(DEFAULT_SLICERS);
  }, []);

  // Seed overrides from URL param so shared links show edited values
  const { overrides, setOverride, applyOverrides } = useMonthlyOverrides();
  useEffect(() => {
    if (!initialOverrides) return;
    Object.entries(initialOverrides).forEach(([key, value]) => setOverride(key, value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slicerOptions = useMemo(() => {
    const months = Array.from(new Set(allInvoices.map(invoiceMonthKey).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: formatMonthOption(value) }));
    return {
      projects: uniqueOptions(allInvoices.map((invoice) => invoice.project_code))
        .map((option) => {
          const invoice = allInvoices.find((row) => row.project_code === option.value);
          return {
            value: option.value,
            label: invoice?.project_name ? `${option.value} - ${invoice.project_name}` : option.value,
          };
        }),
      clients: uniqueOptions(allInvoices.map((invoice) => invoice.client || "Unknown")),
      sectors: uniqueOptions(allInvoices.map((invoice) => invoice.sector || "Other")),
      statuses: uniqueOptions(allInvoices.map((invoice) => invoice.status))
        .map((option) => ({ value: option.value, label: statusLabel(option.value) })),
      months,
    };
  }, [allInvoices]);

  const normalizedMonthRange = useMemo(() => {
    const from = slicers.monthFrom === ALL_VALUE ? null : slicers.monthFrom;
    const to = slicers.monthTo === ALL_VALUE ? null : slicers.monthTo;
    if (from && to && from > to) return { from: to, to: from };
    return { from, to };
  }, [slicers.monthFrom, slicers.monthTo]);

  const financialFilters = useMemo(() => ({
    projectCodes: slicers.projectCode !== ALL_VALUE ? [slicers.projectCode] : undefined,
    clients: slicers.client !== ALL_VALUE ? [slicers.client] : undefined,
    sectors: slicers.sector !== ALL_VALUE ? [slicers.sector] : undefined,
    statuses: slicers.status !== ALL_VALUE ? [slicers.status] : undefined,
    dateFrom: normalizedMonthRange.from ? `${normalizedMonthRange.from}-01` : undefined,
    dateTo: normalizedMonthRange.to ? `${normalizedMonthRange.to}-01` : undefined,
  }), [normalizedMonthRange.from, normalizedMonthRange.to, slicers.client, slicers.projectCode, slicers.sector, slicers.status]);

  const invoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      if (slicers.projectCode !== ALL_VALUE && invoice.project_code !== slicers.projectCode) return false;
      if (slicers.client !== ALL_VALUE && (invoice.client || "Unknown") !== slicers.client) return false;
      if (slicers.sector !== ALL_VALUE && (invoice.sector || "Other") !== slicers.sector) return false;
      if (slicers.status !== ALL_VALUE && invoice.status !== slicers.status) return false;
      const key = invoiceMonthKey(invoice);
      if (normalizedMonthRange.from && (!key || key < normalizedMonthRange.from)) return false;
      if (normalizedMonthRange.to && (!key || key > normalizedMonthRange.to)) return false;
      return true;
    });
  }, [allInvoices, normalizedMonthRange.from, normalizedMonthRange.to, slicers.client, slicers.projectCode, slicers.sector, slicers.status]);

  const activeSlicerCount = useMemo(() => {
    return [
      slicers.projectCode,
      slicers.client,
      slicers.sector,
      slicers.status,
      slicers.monthFrom,
      slicers.monthTo,
    ].filter((value) => value !== ALL_VALUE).length;
  }, [slicers]);

  const updateSlicer = <K extends keyof BoardSlicerState>(key: K, value: BoardSlicerState[K]) => {
    setSelectedProject(null);
    setSlicers((current) => ({ ...current, [key]: value }));
  };

  const financial = useMemo(() => computeFinancialSnapshot({
    invoices: allInvoices,
    collections: boardSnapshot?.collections || [],
    cashFlowTransactions: boardSnapshot?.cashFlowTransactions || [],
    forecasts: boardSnapshot?.forecasts || [],
    filters: financialFilters,
  }), [allInvoices, boardSnapshot, financialFilters]);
  const showCharts = boardSnapshot?.scope?.includeCharts !== false;
  const showTables = boardSnapshot?.scope?.includeTables !== false;

  const stats = useMemo(() => {
    const { portfolio } = financial;
    const submitted = portfolio.total_submitted;
    const approved = portfolio.total_approved;
    const approvedNet = portfolio.total_approved_net;
    const collected = portfolio.total_collections;
    const deductions = invoices.reduce((sum, invoice) => sum + (invoice.total_deductions || 0) + (invoice.approved_deductions || 0), 0);
    const outstanding = portfolio.total_outstanding;
    const contractValue = portfolio.total_contract_value;
    const unbilled = Math.max(contractValue - submitted, 0);
    const pending = invoices.filter((invoice) => statusLabel(invoice.status) === "Pending").length;
    const approvedCount = invoices.filter((invoice) => statusLabel(invoice.status) === "Approved").length;
    const approvalRate = submitted > 0 ? approvedNet / submitted : 0;
    const collectionEfficiency = portfolio.overall_collection_rate;
    return {
      projectCount: portfolio.project_count,
      ipcCount: invoices.length,
      contractValue,
      submitted,
      approved,
      approvedNet,
      collected,
      deductions,
      outstanding,
      unbilled,
      pending,
      approvedCount,
      approvalRate,
      collectionEfficiency,
    };
  }, [financial, invoices]);

  const displayMonthly = useMemo(() => applyOverrides(financial.monthly), [financial.monthly, overrides]);

  const monthlyTrend = useMemo(() => {
    return displayMonthly.map((row) => ({
      key: row.monthKey,
      month: row.month,
      submitted: row.submitted,
      approved: row.approved,
      collected: row.actualCollected,
      forecast: row.forecastCashIn,
    }));
  }, [displayMonthly]);

  const cashPositionTrend = useMemo(() => {
    return displayMonthly.map((row) => ({
      key: row.monthKey,
      month: row.month,
      actualIn: row.actualCollected,
      actualOut: -row.actualCashOut,
      forecastIn: row.forecastCashIn,
      forecastOut: -row.forecastCashOut,
      netForecast: row.netForecast,
    }));
  }, [displayMonthly]);

  const sectorData = useMemo(() => {
    const map = new Map<string, { sector: string; contractValue: number; submitted: number; approved: number }>();
    const seenContract = new Set<string>();
    invoices.forEach((invoice) => {
      const sector = invoice.sector || "Other";
      const row = map.get(sector) || { sector, contractValue: 0, submitted: 0, approved: 0 };
      if (!seenContract.has(invoice.project_code)) {
        row.contractValue += invoice.contract_value || 0;
        seenContract.add(invoice.project_code);
      }
      row.submitted += invoice.work_total || 0;
      row.approved += invoice.approved_total || 0;
      map.set(sector, row);
    });
    return Array.from(map.values()).sort((a, b) => b.contractValue - a.contractValue);
  }, [invoices]);

  const statusData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; amount: number }>();
    invoices.forEach((invoice) => {
      const name = statusLabel(invoice.status);
      const row = map.get(name) || { name, value: 0, amount: 0 };
      row.value += 1;
      row.amount += invoice.work_total || 0;
      map.set(name, row);
    });
    const order = ["Approved", "Pending", "Under Review", "Final", "Rejected", "Unknown"];
    return Array.from(map.values()).sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [invoices]);

  const clientData = useMemo(() => {
    const map = new Map<string, { client: string; approved: number; collected: number; outstanding: number }>();
    financial.projects.forEach((project) => {
      const client = (project.client || "Unknown").trim();
      const row = map.get(client) || { client, approved: 0, collected: 0, outstanding: 0 };
      row.approved += project.approved_net;
      row.collected += project.actual_collected;
      row.outstanding += project.outstanding;
      map.set(client, row);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  }, [financial.projects]);

  const waterfallData = useMemo(() => {
    const net = Math.max(stats.submitted - stats.deductions, 0);
    return [
      { name: "Gross Work", value: stats.submitted, fill: "#2563eb" },
      { name: "Deductions", value: -stats.deductions, fill: "#dc2626" },
      { name: "Net Submitted", value: net, fill: "#16a34a" },
      { name: "Approved Net", value: stats.approvedNet, fill: "#0d9488" },
      { name: "Collected", value: stats.collected, fill: "#d97706" },
    ];
  }, [stats]);

  const agingData = useMemo(() => {
    return financial.aging.map((bucket, index) => ({
      range: bucket.days,
      amount: bucket.amount,
      fill: AGING_COLORS[index] || "#dc2626",
    }));
  }, [financial.aging]);

  const delayData = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.submitted_date && invoice.approval_date)
      .map((invoice) => {
        const submitted = new Date(invoice.submitted_date!);
        const approved = new Date(invoice.approval_date!);
        const days = Math.max(Math.ceil((approved.getTime() - submitted.getTime()) / 86_400_000), 0);
        return {
          label: `${invoice.project_code} / IPC #${invoice.invoice_number || "-"}`,
          days,
          net: invoice.approved_net_total || 0,
          color: days <= 28 ? "#16a34a" : days <= 56 ? "#d97706" : "#dc2626",
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 12);
  }, [invoices]);

  const projects = useMemo(() => {
    return financial.projects.map((project) => ({
      code: project.project_code,
      name: project.project_name,
      client: project.client,
      contractValue: project.contract_value,
      submitted: project.submitted_total,
      approved: project.approved_total,
      approvedNet: project.approved_net,
      collected: project.actual_collected,
      latestStatus: project.status,
      ipcCount: project.ipc_count,
      outstanding: project.outstanding,
      collectionEfficiency: project.collection_efficiency,
    })).sort((a, b) => {
      if (slicers.projectSort === "contract") return b.contractValue - a.contractValue || a.code.localeCompare(b.code);
      if (slicers.projectSort === "collection") return a.collectionEfficiency - b.collectionEfficiency || b.outstanding - a.outstanding || a.code.localeCompare(b.code);
      return b.outstanding - a.outstanding || b.contractValue - a.contractValue || a.code.localeCompare(b.code);
    });
  }, [financial.projects, slicers.projectSort]);

  const boardSignals = useMemo(() => {
    const highestOutstanding = projects
      .map((project) => ({ label: project.code, value: Math.max(project.approvedNet - project.collected, 0) }))
      .sort((a, b) => b.value - a.value)[0];

    const largestGap = projects
      .map((project) => ({
        label: project.code,
        value: project.submitted > 0 ? Math.max((project.submitted - project.approved) / project.submitted, 0) : 0,
      }))
      .sort((a, b) => b.value - a.value)[0];

    const collectionScore = Math.min(stats.collectionEfficiency, 1) * 35;
    const approvalScore = Math.min(stats.approvalRate, 1) * 30;
    const outstandingPressure = stats.approvedNet > 0 ? Math.min(stats.outstanding / stats.approvedNet, 1) : 0;
    const pendingPressure = stats.ipcCount > 0 ? Math.min(stats.pending / stats.ipcCount, 1) : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(35 + collectionScore + approvalScore - outstandingPressure * 22 - pendingPressure * 18)));

    return { highestOutstanding, largestGap, healthScore };
  }, [projects, stats]);

  const alerts = useMemo(() => {
    return financial.controlIssues
      .filter((issue) => issue.project_code)
      .map((issue) => ({
        type: issue.severity === "critical" ? "critical" as const : "warning" as const,
        project: issue.project_code!,
        message: `${issue.project_code}: ${issue.title}`,
        value: issue.value,
      }))
      .slice(0, 10);
  }, [financial.controlIssues]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "radial-gradient(ellipse at top, #f1f5f9, #f8fafc 50%)" }}>
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full" style={{ border: "2px solid transparent", borderTopColor: "#2563eb", borderRightColor: "#7c3aed" }} />
            <div className="absolute inset-2 animate-spin rounded-full" style={{ border: "2px solid transparent", borderBottomColor: "#0d9488", animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm font-semibold text-slate-500">Loading board data...</p>
          <p className="mt-1 text-[11px] text-slate-400">Preparing your executive snapshot</p>
        </div>
      </div>
    );
  }

  if (error || allInvoices.length === 0) {
    const errMsg = String((error as any)?.message || "");
    const isRevoked = errMsg.startsWith("REVOKED:");
    const isExpired = errMsg.startsWith("EXPIRED:");
    const isNotFound = errMsg.startsWith("NOT_FOUND:");

    const title = isRevoked
      ? "Link Revoked — تم إلغاء الرابط"
      : isExpired
        ? "Link Expired — انتهت صلاحية الرابط"
        : isNotFound
          ? "Invalid Link — رابط غير صالح"
          : "No shared dashboard data";

    const subtitle = isRevoked
      ? "This share link has been revoked by the administrator. Please request a new link."
      : isExpired
        ? "This share link has expired. Please request a new link from the project administrator."
        : isNotFound
          ? "This share link does not exist or was never created."
          : "This link has no online snapshot data. Regenerate the share link.";

    const borderColor = isRevoked ? "#fecaca" : isExpired ? "#fde68a" : "#fecaca";
    const bgColor = isRevoked ? "#fef2f2" : isExpired ? "#fffbeb" : "#fef2f2";
    const iconColor = isRevoked ? "text-red-500" : isExpired ? "text-amber-500" : "text-red-400";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-xl border p-8 text-center shadow-sm" style={{ borderColor, background: bgColor }}>
          <AlertTriangle className={`mx-auto mb-4 ${iconColor}`} size={48} />
          <h1 className="mb-2 text-xl font-black text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{subtitle}</p>
          {(isRevoked || isExpired) && (
            <p className="mt-4 text-xs text-slate-400">
              Contact the link owner to generate a fresh share link from the IPC Command Center.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #f1f5f9, #f8fafc 40%, #f8fafc)" }}>
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* ── Premium Report Header ── */}
        <motion.header id="overview" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-2xl"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)", boxShadow: "0 4px 24px rgba(15,23,42,0.15), 0 1px 3px rgba(0,0,0,0.1)" }}
        >
          {/* Gradient mesh accents */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent" />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-center gap-5">
              <img src="/logos/pzone-horizontal-white.png" alt="P.ZONE" className="hidden h-14 drop-shadow-lg md:block" />
              <img src="/logos/pzone-vertical-black.png" alt="P.ZONE" className="h-16 brightness-0 invert drop-shadow-lg md:hidden" />
              <div className="hidden h-12 w-px bg-white/20 md:block" />
              <div>
                <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">IPC Board Report</h1>
                <p className="text-[11px] text-blue-200/70">Read-only executive snapshot — لوحة مشاركة تنفيذية</p>
                <p className="mt-0.5 text-[10px] text-blue-300/40">Developed By Eng AL Hassan A.Soliman</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest text-blue-300/60">Report Date</div>
                <div className="text-sm font-bold text-white">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                {initialPage && initialPage !== "overview" && <div className="text-[10px] text-blue-300/50">Requested page: {initialPage}</div>}
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/20 print:hidden"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Download size={16} />
                Export PDF
              </button>
            </div>
          </div>
          {/* Bottom gradient divider */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-400" />
        </motion.header>

        {/* ── Sticky Navigation ── */}
        <div className="sticky top-0 z-30 -mx-6 border-b border-slate-200/80 bg-white/90 px-6 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["Overview", "#overview", Gauge],
              ["Trends", "#trends", TrendingUp],
              ["Risk", "#risk", AlertTriangle],
              ["Projects", "#projects", Target],
            ].map(([label, href, Icon]: any) => (
              <a
                key={label}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
              >
                <Icon size={13} />
                {label}
              </a>
            ))}
            <div className="ml-auto hidden text-[11px] text-slate-500 md:block">
              {stats.projectCount} projects / {stats.ipcCount} IPCs / {fmtMoney(stats.contractValue)} contract value
            </div>
          </div>
        </div>

        {/* ── Slicers ── */}
        <SharedBoardSlicers
          slicers={slicers}
          options={slicerOptions}
          activeCount={activeSlicerCount}
          filteredCount={invoices.length}
          totalCount={allInvoices.length}
          onChange={updateSlicer}
          onReset={() => {
            setSelectedProject(null);
            setDrillSource(null);
            setDrillLabel("");
            setSlicers(DEFAULT_SLICERS);
          }}
        />

        {/* ── Drill-Down Indicator ── */}
        <AnimatePresence>
          <DrillDownBanner source={drillSource} label={drillLabel} onClear={clearDrill} />
        </AnimatePresence>

        {invoices.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-bold text-amber-800">No records match the selected slicers.</div>
            <div className="mt-1 text-xs text-slate-500">Reset filters or widen the month range to restore the shared dashboard data.</div>
          </div>
        )}

        {/* ── Executive Brief ── */}
        <ExecutiveBrief
          score={boardSignals.healthScore}
          collected={stats.collected}
          outstanding={stats.outstanding}
          unbilled={stats.unbilled}
          approvalRate={stats.approvalRate}
          collectionEfficiency={stats.collectionEfficiency}
          highestOutstanding={boardSignals.highestOutstanding}
          largestGap={boardSignals.largestGap}
        />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Building2} label="Projects" labelAr="المشاريع" value={String(stats.projectCount)} sub={`${stats.ipcCount} IPC records`} color="#7c3aed" delay={0} />
          <KPI icon={Shield} label="Contract Value" labelAr="قيمة العقود" value={fmtMoney(stats.contractValue)} color="#2563eb" delay={0.04} />
          <KPI icon={FileSpreadsheet} label="Submitted" labelAr="المقدم" value={fmtMoney(stats.submitted)} color="#2563eb" delay={0.08} />
          <KPI icon={Check} label="Approved" labelAr="المعتمد" value={fmtMoney(stats.approved)} color="#16a34a" delay={0.12} />
          <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(stats.collected)} color="#d97706" delay={0.16} />
          <KPI icon={Percent} label="Approval Rate" labelAr="نسبة الاعتماد" value={fmtPct(stats.approvalRate)} color={stats.approvalRate >= 0.8 ? "#16a34a" : "#dc2626"} delay={0.2} />
          <KPI icon={TrendingUp} label="Outstanding" labelAr="المتبقي" value={fmtMoney(stats.outstanding)} color="#dc2626" delay={0.24} />
          <KPI icon={Clock} label="Pending IPCs" labelAr="تحت الاعتماد" value={String(stats.pending)} color="#d97706" delay={0.28} />
        </div>

        {/* ── Charts Section ── */}
        {showCharts && (
        <>
        <ChartCard title="Payment Flow - مسار المستخلصات" icon={TrendingUp} color="#7c3aed" onReset={drillSource ? clearDrill : undefined}>
          <div className="space-y-3">
            {[
              ["Contract Value", stats.contractValue, "#2563eb"],
              ["Submitted", stats.submitted, "#2563eb"],
              ["Approved Net", stats.approvedNet, "#16a34a"],
              ["Collected", stats.collected, "#d97706"],
              ["Outstanding", stats.outstanding, "#dc2626"],
            ].map(([label, value, color], index) => {
              const pct = stats.contractValue > 0 ? (Number(value) / stats.contractValue) * 100 : 0;
              return (
                <div key={String(label)} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-mono font-bold text-slate-900">{fmtFull(Number(value))} <span className="text-slate-400">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + index * 0.06 }}
                      className="flex h-full items-center justify-end rounded-lg pr-3"
                      style={{ background: `linear-gradient(90deg, ${color}55, ${color})` }}
                    >
                      <span className="text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard id="trends" title="Monthly Submitted vs Approved vs Collected - الاتجاه الشهري" icon={TrendingUp} color="#2563eb" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.key) {
                  const d = e.activePayload[0].payload;
                  drillDown("month", "monthFrom", d.key, d.month);
                  setSlicers((prev) => ({ ...prev, monthTo: d.key }));
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} style={{ cursor: "pointer" }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#16a34a" strokeWidth={2} dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="#d97706" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="forecast" name="Forecast In" stroke="#0d9488" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px] text-slate-400">Click any data point to drill-down by month</div>
          </ChartCard>

          <ChartCard title="Cash Position: Actual + Forecast - المركز النقدي الفعلي والمتوقع" icon={Wallet} color="#0d9488" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashPositionTrend} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.key) {
                  const d = e.activePayload[0].payload;
                  drillDown("month", "monthFrom", d.key, d.month);
                  setSlicers((prev) => ({ ...prev, monthTo: d.key }));
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="actualIn" name="Actual In" fill="#16a34a" radius={[5, 5, 0, 0]} cursor="pointer" />
                <Bar dataKey="actualOut" name="Actual Out" fill="#dc2626" radius={[5, 5, 0, 0]} cursor="pointer" />
                <Line type="monotone" dataKey="forecastIn" name="Forecast In" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="forecastOut" name="Forecast Out" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netForecast" name="Net Forecast" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sector Breakdown - القطاعات" icon={Building2} color="#7c3aed" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorData} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sector) {
                  drillDown("sector", "sector", e.activePayload[0].payload.sector, e.activePayload[0].payload.sector);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <YAxis type="category" dataKey="sector" tick={{ fill: "#64748b", fontSize: 11 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="contractValue" name="Contract Value" radius={[0, 6, 6, 0]} cursor="pointer">
                  {sectorData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px] text-slate-400">Click any bar to drill-down by sector</div>
          </ChartCard>

          <ChartCard title="Status Distribution - توزيع الحالات" icon={Check} color="#16a34a" onReset={drillSource ? clearDrill : undefined}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3}
                    onClick={(_, index) => {
                      const entry = statusData[index];
                      if (entry) {
                        const rawStatus = allInvoices.find((inv) => statusLabel(inv.status) === entry.name)?.status || entry.name;
                        drillDown("status", "status", rawStatus, entry.name);
                      }
                    }}
                    cursor="pointer"
                  >
                    {statusData.map((entry, index) => <Cell key={index} fill={statusColor(entry.name) || COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusData.map((entry) => {
                  const rawStatus = allInvoices.find((inv) => statusLabel(inv.status) === entry.name)?.status || entry.name;
                  return (
                    <button
                      key={entry.name}
                      onClick={() => drillDown("status", "status", rawStatus, entry.name)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs transition-all hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(entry.name) }} />
                        <span className="text-slate-700">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{entry.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-center text-[10px] text-slate-400">Click any slice or legend item to drill-down by status</div>
          </ChartCard>

          <ChartCard title="Collection by Client - التحصيل حسب العميل" icon={Wallet} color="#d97706" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={clientData} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.client) {
                  drillDown("client", "client", e.activePayload[0].payload.client, e.activePayload[0].payload.client);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <YAxis type="category" dataKey="client" tick={{ fill: "#64748b", fontSize: 11 }} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="approved" name="Approved Net" fill="#16a34a88" radius={[0, 6, 6, 0]} cursor="pointer" />
                <Bar dataKey="collected" name="Collected" fill="#d97706" radius={[0, 6, 6, 0]} cursor="pointer" />
                <Bar dataKey="outstanding" name="Outstanding" fill="#dc262688" radius={[0, 6, 6, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px] text-slate-400">Click any bar to drill-down by client</div>
          </ChartCard>

          <ChartCard id="risk" title="Certified Analysis - تحليل المعتمد" subtitle="Gross, deductions, net, approved and collected movement" icon={FileSpreadsheet} color="#0891b2" onReset={drillSource ? clearDrill : undefined}>
            <div className="space-y-3">
              {waterfallData.map((item, index) => {
                const maxValue = Math.max(...waterfallData.map((row) => Math.abs(row.value)), 1);
                const pct = (Math.abs(item.value) / maxValue) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-right text-[10px] font-bold text-slate-500">{item.name}</div>
                    <div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.06 }}
                        className="flex h-full items-center justify-end rounded-lg px-2"
                        style={{ background: `linear-gradient(90deg, ${item.fill}55, ${item.fill})` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.value < 0 ? "-" : ""}{fmtMoney(Math.abs(item.value))}</span>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Collection Aging - أعمار الديون" subtitle="Outstanding approved receivables by age bucket" icon={Clock} color="#d97706" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>
                  {agingData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {delayData.length > 0 && (
          <ChartCard title="Payment Delay Tracker - متابعة تأخير الاعتماد" subtitle="Days from submitted date to approval date" icon={Clock} color="#ea580c" onReset={drillSource ? clearDrill : undefined}>
            <div className="space-y-2">
              {delayData.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate font-mono text-[10px] text-slate-500">{item.label}</div>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.days / 120) * 100, 100)}%` }}
                      transition={{ duration: 0.5, delay: 0.15 + index * 0.03 }}
                      className="flex h-full items-center justify-end rounded-md pr-2"
                      style={{ background: `linear-gradient(90deg, ${item.color}44, ${item.color})` }}
                    >
                      <span className="text-[9px] font-bold text-white">{item.days}d</span>
                    </motion.div>
                    <div className="absolute bottom-0 top-0 w-px bg-slate-400/50" style={{ left: `${(42 / 120) * 100}%` }} />
                  </div>
                  <div className="w-20 text-right font-mono text-[10px] text-slate-400">{fmtMoney(item.net)}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
        </>
        )}

        {/* ── Tables Section ── */}
        {showTables && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard id="projects" title="Top Projects - أكبر المشاريع" icon={Building2} color="#7c3aed" delay={0.3}>
            <div className="space-y-3">
              {projects.slice(0, 10).map((project, index) => {
                const collectionPct = project.approvedNet > 0 ? (project.collected / project.approvedNet) * 100 : 0;
                return (
                  <button
                    key={project.code}
                    onClick={() => setSelectedProject(project.code)}
                    className="group w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${COLORS[index % COLORS.length]}14`, color: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{project.code}</span>
                          <span className="font-mono text-[10px] text-slate-500">{fmtMoney(project.contractValue)}</span>
                        </div>
                        <div className="truncate text-[10px] text-slate-400">{project.name}</div>
                      </div>
                      <span className="text-slate-300 transition group-hover:text-blue-500">›</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(collectionPct, 100)}%`, background: COLORS[index % COLORS.length] }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard title="Smart Alerts and Project Register - التنبيهات وسجل المشاريع" icon={AlertTriangle} color="#dc2626" delay={0.3}>
              <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {alerts.length === 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">No critical alerts in this snapshot.</div>
                ) : alerts.slice(0, 4).map((alert, index) => (
                  <button
                    key={`${alert.project}-${index}`}
                    onClick={() => setSelectedProject(alert.project)}
                    className="rounded-lg border p-4 text-left transition hover:shadow-sm"
                    style={{
                      background: alert.type === "critical" ? "#fef2f2" : "#fffbeb",
                      borderColor: alert.type === "critical" ? "#fecaca" : "#fde68a",
                    }}
                  >
                    <div className="mb-1 text-xs font-bold text-slate-800">{alert.message}</div>
                    <div className="text-[10px] text-slate-500">Open project detail</div>
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[1fr_1fr_110px_110px_110px] bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div>Project</div>
                  <div>Client</div>
                  <div className="text-right">Approved</div>
                  <div className="text-right">Collected</div>
                  <div className="text-right">Outstanding</div>
                </div>
                {projects.slice(0, 14).map((project) => {
                  const outstanding = Math.max(project.approvedNet - project.collected, 0);
                  return (
                    <button
                      key={project.code}
                      onClick={() => setSelectedProject(project.code)}
                      className="grid w-full grid-cols-[1fr_1fr_110px_110px_110px] border-t border-slate-100 px-3 py-2 text-left text-xs transition hover:bg-slate-50/80"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{project.code}</div>
                        <div className="truncate text-[10px] text-slate-400">{project.name}</div>
                      </div>
                      <div className="truncate text-slate-600">{project.client}</div>
                      <div className="text-right font-mono text-green-600">{fmtMoney(project.approvedNet)}</div>
                      <div className="text-right font-mono text-amber-600">{fmtMoney(project.collected)}</div>
                      <div className="text-right font-mono text-red-600">{fmtMoney(outstanding)}</div>
                    </button>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </div>
        )}

        {showTables && <ProjectPanel projectCode={selectedProject} invoices={invoices} onClose={() => setSelectedProject(null)} />}

        {/* ── Footer ── */}
        <footer className="-mx-6 -mb-6 mt-10 px-6 pb-6 pt-6 text-center lg:-mx-8 lg:-mb-8 lg:px-8" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <img src="/logos/pzone-horizontal-white.png" alt="P.ZONE" className="mx-auto mb-3 h-8 opacity-60" />
          <p className="text-[11px] text-slate-500">
            IPC Board Report — Read-only online snapshot — {new Date().toLocaleString("en-GB")}
          </p>
          <p className="mt-1.5 text-[10px] font-medium text-blue-400/50">Developed By Eng AL Hassan A.Soliman</p>
          <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </footer>
      </div>
    </div>
  );
}
