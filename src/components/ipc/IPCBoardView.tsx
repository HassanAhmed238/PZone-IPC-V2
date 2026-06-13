import { useEffect, useMemo, useState } from "react";
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

const COLORS = ["#667eea", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#14b8a6"];
const AGING_COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];

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
  if (label === "Approved") return "#22c55e";
  if (label === "Pending") return "#f59e0b";
  if (label === "Under Review") return "#3b82f6";
  if (label === "Final") return "#a855f7";
  if (label === "Rejected") return "#ef4444";
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
    <div className="rounded-xl border border-white/10 bg-[#0a1628]/95 p-3 text-xs shadow-2xl">
      {label && <div className="mb-2 font-bold text-slate-300">{label}</div>}
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-5 py-0.5">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-mono font-bold text-white">
            {typeof item.value === "number" ? fmtFull(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function getTone(score: number) {
  if (score >= 80) return { label: "Strong", color: "#22c55e", bg: "#22c55e14" };
  if (score >= 60) return { label: "Watch", color: "#f59e0b", bg: "#f59e0b14" };
  return { label: "Critical", color: "#ef4444", bg: "#ef444414" };
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-5"
      style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-3xl" style={{ background: color }} />
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="mb-0.5 text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] font-semibold text-slate-400">
        {label} <span className="text-slate-600">/ {labelAr}</span>
      </div>
      {sub && <div className="mt-1 text-[10px] font-mono text-slate-500">{sub}</div>}
      <div className="absolute inset-x-0 bottom-0 h-0.5 opacity-60" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </motion.div>
  );
}

function ChartCard({ id, title, subtitle, icon: Icon, color, children, delay = 0.3 }: {
  id?: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/[0.06] p-5"
      style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}
    >
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
        <Icon size={15} style={{ color }} />
        {title}
      </h3>
      {subtitle && <p className="mb-4 text-[10px] text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
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
  return "h-10 w-full rounded-xl border border-white/[0.08] bg-[#071120] px-3 text-xs font-semibold text-slate-100 outline-none transition focus:border-purple-400/60";
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
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
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
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
            <Filter size={17} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Shared Filters / Slicers</h2>
            <p className="text-[11px] text-slate-500">Read-only filters inside the shared snapshot. They do not expand the original share scope.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-slate-300">
            {filteredCount} / {totalCount} IPCs
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0 && slicers.projectSort === DEFAULT_SLICERS.projectSort}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-bold text-slate-300 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Active slicers</div>
          <div className="mt-1 text-lg font-black text-white">{activeCount}</div>
          <div className="text-[10px] text-slate-500">Applied to KPIs, charts, alerts, and tables</div>
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
    { label: "Approved collection efficiency", value: fmtPct(collectionEfficiency), color: collectionEfficiency >= 0.75 ? "#22c55e" : "#f59e0b" },
    { label: "Approval conversion", value: fmtPct(approvalRate), color: approvalRate >= 0.75 ? "#22c55e" : "#ef4444" },
    { label: "Outstanding receivable", value: fmtMoney(outstanding), color: outstanding > collected * 0.5 ? "#ef4444" : "#f59e0b" },
    { label: "Remaining to bill", value: fmtMoney(unbilled), color: "#3b82f6" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]"
    >
      <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "linear-gradient(135deg, #101827, #172238)" }}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Executive Health</div>
            <div className="text-3xl font-black text-white">{score}<span className="text-base text-slate-500">/100</span></div>
          </div>
          <div className="rounded-xl px-3 py-1.5 text-xs font-black" style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.color}33` }}>
            {tone.label}
          </div>
        </div>
        <div className="relative mb-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tone.color}88, ${tone.color})` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.03] p-2">
            <div className="text-[10px] text-slate-500">Cash In</div>
            <div className="font-mono text-xs font-black text-amber-300">{fmtMoney(collected)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <div className="text-[10px] text-slate-500">Open AR</div>
            <div className="font-mono text-xs font-black text-red-300">{fmtMoney(outstanding)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <div className="text-[10px] text-slate-500">Unbilled</div>
            <div className="font-mono text-xs font-black text-blue-300">{fmtMoney(unbilled)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Board Brief - ملخص تنفيذي</div>
            <div className="text-[11px] text-slate-500">Cash, approvals, receivables, and immediate risk signals</div>
          </div>
          <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-right md:block">
            <div className="text-[10px] text-slate-500">Highest Outstanding</div>
            <div className="font-mono text-xs font-bold text-red-200">{highestOutstanding ? `${highestOutstanding.label} / ${fmtMoney(highestOutstanding.value)}` : "-"}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.025] px-4 py-3">
              <span className="text-xs text-slate-400">{row.label}</span>
              <span className="font-mono text-sm font-black" style={{ color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-300">Largest Approval Gap</div>
            <div className="mt-1 font-mono text-xs font-black text-white">{largestGap ? `${largestGap.label} / ${fmtPct(largestGap.value)}` : "-"}</div>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Board Focus</div>
            <div className="mt-1 text-xs font-semibold text-slate-200">{outstanding > collected ? "Collections pressure is the leading risk" : "Cash collection is tracking ahead of risk"}</div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-white/[0.06]"
            style={{ background: "linear-gradient(135deg, #0a1628 0%, #111827 100%)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0a1628]/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
                  <Building2 size={20} className="text-purple-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">{projectCode}</h2>
                  <p className="text-xs text-slate-400">{projectName}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["Client", client, "#667eea"],
                  ["Sector", sector, "#a855f7"],
                  ["Contract Value", fmtMoney(contractValue), "#22c55e"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] p-3" style={{ background: `${color}10` }}>
                    <div className="mb-1 text-[10px] text-slate-500">{label}</div>
                    <div className="text-sm font-black" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KPI icon={FileSpreadsheet} label="Total Submitted" labelAr="المقدم" value={fmtMoney(submitted)} color="#3b82f6" delay={0} />
                <KPI icon={Check} label="Total Approved" labelAr="المعتمد" value={fmtMoney(approved)} color="#22c55e" delay={0.03} />
                <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(collected)} color="#f59e0b" delay={0.06} />
                <KPI icon={AlertTriangle} label="Approval Gap" labelAr="فجوة الاعتماد" value={fmtPct(gapPct)} color={gapPct > 0.25 ? "#ef4444" : "#f59e0b"} delay={0.09} />
              </div>

              <ChartCard title="Cumulative IPC Curve - منحنى المستخلصات" icon={TrendingUp} color="#a855f7">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Submitted" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} />
                    <Area type="monotone" dataKey="Approved" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                    <Area type="monotone" dataKey="Collected" stroke="#f59e0b" fill="#f59e0b18" strokeWidth={2} strokeDasharray="4 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`IPC History - سجل المستخلصات (${projectInvoices.length})`} icon={Wallet} color="#a855f7">
                <div className="space-y-3">
                  {projectInvoices.map((invoice, index) => {
                    const color = statusColor(invoice.status);
                    return (
                      <div key={`${invoice.id}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">IPC #{invoice.invoice_number || "-"}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color, background: `${color}18` }}>
                              {statusLabel(invoice.status)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">{invoice.submitted_date || invoice.approval_date || "-"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-[10px] text-slate-500">Submitted</div>
                            <div className="font-mono text-xs font-black text-blue-300">{fmtMoney(invoice.work_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500">Approved</div>
                            <div className="font-mono text-xs font-black text-green-300">{fmtMoney(invoice.approved_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500">Collected</div>
                            <div className="font-mono text-xs font-black text-amber-300">{fmtMoney(invoice.total_collections || 0)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              {deductionData.length > 0 && (
                <ChartCard title="Deduction Breakdown - تفصيل الاستقطاعات" icon={Percent} color="#ef4444">
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
                            <span className="truncate text-slate-400">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-white">{fmtMoney(item.value)}</span>
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
      { name: "Gross Work", value: stats.submitted, fill: "#3b82f6" },
      { name: "Deductions", value: -stats.deductions, fill: "#ef4444" },
      { name: "Net Submitted", value: net, fill: "#22c55e" },
      { name: "Approved Net", value: stats.approvedNet, fill: "#14b8a6" },
      { name: "Collected", value: stats.collected, fill: "#f59e0b" },
    ];
  }, [stats]);

  const agingData = useMemo(() => {
    return financial.aging.map((bucket, index) => ({
      range: bucket.days,
      amount: bucket.amount,
      fill: AGING_COLORS[index] || "#ef4444",
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
          color: days <= 28 ? "#22c55e" : days <= 56 ? "#f59e0b" : "#ef4444",
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #020817, #0a1628)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
          <p className="text-slate-400">Loading board data...</p>
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

    const borderColor = isRevoked ? "rgba(239,68,68,0.3)" : isExpired ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.2)";
    const bgColor = isRevoked ? "rgba(239,68,68,0.08)" : isExpired ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.05)";
    const iconColor = isRevoked ? "text-red-400" : isExpired ? "text-amber-400" : "text-red-300";

    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #020817, #0a1628)" }}>
        <div className="max-w-lg rounded-2xl border p-8 text-center" style={{ borderColor, background: bgColor }}>
          <AlertTriangle className={`mx-auto mb-4 ${iconColor}`} size={48} />
          <h1 className="mb-2 text-xl font-black text-white">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>
          {(isRevoked || isExpired) && (
            <p className="mt-4 text-xs text-slate-600">
              Contact the link owner to generate a fresh share link from the IPC Command Center.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-6" style={{ background: "linear-gradient(135deg, #020817, #0a1628)" }}>
      <motion.header id="overview" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", boxShadow: "0 4px 20px #667eea55" }}>
            <FileSpreadsheet size={21} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">IPC Board Dashboard</h1>
            <p className="text-xs text-slate-500">Read-only executive snapshot - لوحة مشاركة تنفيذية</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Shared View</div>
          <div className="text-sm font-bold text-white">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
          {initialPage && initialPage !== "overview" && <div className="text-[10px] text-slate-500">Requested page: {initialPage}</div>}
        </div>
      </motion.header>

      <div className="sticky top-0 z-30 -mx-6 border-y border-white/[0.06] bg-[#050b16]/85 px-6 py-3 backdrop-blur-xl">
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white"
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

      <SharedBoardSlicers
        slicers={slicers}
        options={slicerOptions}
        activeCount={activeSlicerCount}
        filteredCount={invoices.length}
        totalCount={allInvoices.length}
        onChange={updateSlicer}
        onReset={() => {
          setSelectedProject(null);
          setSlicers(DEFAULT_SLICERS);
        }}
      />

      {invoices.length === 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <div className="text-sm font-black text-amber-200">No records match the selected slicers.</div>
          <div className="mt-1 text-xs text-slate-400">Reset filters or widen the month range to restore the shared dashboard data.</div>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI icon={Building2} label="Projects" labelAr="المشاريع" value={String(stats.projectCount)} sub={`${stats.ipcCount} IPC records`} color="#a855f7" delay={0} />
        <KPI icon={Shield} label="Contract Value" labelAr="قيمة العقود" value={fmtMoney(stats.contractValue)} color="#667eea" delay={0.04} />
        <KPI icon={FileSpreadsheet} label="Submitted" labelAr="المقدم" value={fmtMoney(stats.submitted)} color="#3b82f6" delay={0.08} />
        <KPI icon={Check} label="Approved" labelAr="المعتمد" value={fmtMoney(stats.approved)} color="#22c55e" delay={0.12} />
        <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(stats.collected)} color="#f59e0b" delay={0.16} />
        <KPI icon={Percent} label="Approval Rate" labelAr="نسبة الاعتماد" value={fmtPct(stats.approvalRate)} color={stats.approvalRate >= 0.8 ? "#22c55e" : "#ef4444"} delay={0.2} />
        <KPI icon={TrendingUp} label="Outstanding" labelAr="المتبقي" value={fmtMoney(stats.outstanding)} color="#ef4444" delay={0.24} />
        <KPI icon={Clock} label="Pending IPCs" labelAr="تحت الاعتماد" value={String(stats.pending)} color="#f59e0b" delay={0.28} />
      </div>

      {showCharts && (
      <>
      <ChartCard title="Payment Flow - مسار المستخلصات" icon={TrendingUp} color="#a855f7">
        <div className="space-y-3">
          {[
            ["Contract Value", stats.contractValue, "#667eea"],
            ["Submitted", stats.submitted, "#3b82f6"],
            ["Approved Net", stats.approvedNet, "#22c55e"],
            ["Collected", stats.collected, "#f59e0b"],
            ["Outstanding", stats.outstanding, "#ef4444"],
          ].map(([label, value, color], index) => {
            const pct = stats.contractValue > 0 ? (Number(value) / stats.contractValue) * 100 : 0;
            return (
              <div key={String(label)} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-mono font-bold text-white">{fmtFull(Number(value))} <span className="text-slate-500">({pct.toFixed(1)}%)</span></span>
                </div>
                <div className="h-8 overflow-hidden rounded-xl bg-slate-800/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.25 + index * 0.08 }}
                    className="flex h-full items-center justify-end rounded-xl pr-3"
                    style={{ background: `linear-gradient(90deg, ${color}66, ${color})` }}
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
        <ChartCard id="trends" title="Monthly Submitted vs Approved vs Collected - الاتجاه الشهري" icon={TrendingUp} color="#3b82f6">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="approved" name="Approved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="forecast" name="Forecast In" stroke="#14b8a6" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cash Position: Actual + Forecast - المركز النقدي الفعلي والمتوقع" icon={Wallet} color="#14b8a6">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={cashPositionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="actualIn" name="Actual In" fill="#22c55e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="actualOut" name="Actual Out" fill="#ef4444" radius={[5, 5, 0, 0]} />
              <Line type="monotone" dataKey="forecastIn" name="Forecast In" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="forecastOut" name="Forecast Out" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="netForecast" name="Net Forecast" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sector Breakdown - القطاعات" icon={Building2} color="#a855f7">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sectorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
              <YAxis type="category" dataKey="sector" tick={{ fill: "#94a3b8", fontSize: 11 }} width={110} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="contractValue" name="Contract Value" radius={[0, 6, 6, 0]}>
                {sectorData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution - توزيع الحالات" icon={Check} color="#22c55e">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3}>
                  {statusData.map((entry, index) => <Cell key={index} fill={statusColor(entry.name) || COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(entry.name) }} />
                    <span className="text-slate-300">{entry.name}</span>
                  </div>
                  <span className="font-bold text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Collection by Client - التحصيل حسب العميل" icon={Wallet} color="#f59e0b">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={clientData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
              <YAxis type="category" dataKey="client" tick={{ fill: "#94a3b8", fontSize: 11 }} width={130} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="approved" name="Approved Net" fill="#22c55e88" radius={[0, 6, 6, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#ef444488" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard id="risk" title="Certified Analysis - تحليل المعتمد" subtitle="Gross, deductions, net, approved and collected movement" icon={FileSpreadsheet} color="#06b6d4">
          <div className="space-y-3">
            {waterfallData.map((item, index) => {
              const maxValue = Math.max(...waterfallData.map((row) => Math.abs(row.value)), 1);
              const pct = (Math.abs(item.value) / maxValue) * 100;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-right text-[10px] font-bold text-slate-400">{item.name}</div>
                  <div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-800/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: 0.3 + index * 0.08 }}
                      className="flex h-full items-center justify-end rounded-lg px-2"
                      style={{ background: `linear-gradient(90deg, ${item.fill}66, ${item.fill})` }}
                    >
                      <span className="text-[10px] font-bold text-white">{item.value < 0 ? "-" : ""}{fmtMoney(Math.abs(item.value))}</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Collection Aging - أعمار الديون" subtitle="Outstanding approved receivables by age bucket" icon={Clock} color="#f59e0b">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>
                {agingData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {delayData.length > 0 && (
        <ChartCard title="Payment Delay Tracker - متابعة تأخير الاعتماد" subtitle="Days from submitted date to approval date" icon={Clock} color="#f97316">
          <div className="space-y-2">
            {delayData.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                <div className="w-40 shrink-0 truncate font-mono text-[10px] text-slate-400">{item.label}</div>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-800/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.days / 120) * 100, 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.04 }}
                    className="flex h-full items-center justify-end rounded-md pr-2"
                    style={{ background: `linear-gradient(90deg, ${item.color}55, ${item.color})` }}
                  >
                    <span className="text-[9px] font-bold text-white">{item.days}d</span>
                  </motion.div>
                  <div className="absolute bottom-0 top-0 w-px bg-white/30" style={{ left: `${(42 / 120) * 100}%` }} />
                </div>
                <div className="w-20 text-right font-mono text-[10px] text-slate-500">{fmtMoney(item.net)}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
      </>
      )}

      {showTables && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard id="projects" title="Top Projects - أكبر المشاريع" icon={Building2} color="#a855f7" delay={0.45}>
          <div className="space-y-3">
            {projects.slice(0, 10).map((project, index) => {
              const collectionPct = project.approvedNet > 0 ? (project.collected / project.approvedNet) * 100 : 0;
              return (
                <button
                  key={project.code}
                  onClick={() => setSelectedProject(project.code)}
                  className="group w-full rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-left transition hover:border-purple-400/30 hover:bg-white/[0.05]"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${COLORS[index % COLORS.length]}22`, color: COLORS[index % COLORS.length] }}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{project.code}</span>
                        <span className="font-mono text-[10px] text-slate-300">{fmtMoney(project.contractValue)}</span>
                      </div>
                      <div className="truncate text-[10px] text-slate-500">{project.name}</div>
                    </div>
                    <span className="text-slate-600 transition group-hover:text-purple-300">›</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(collectionPct, 100)}%`, background: COLORS[index % COLORS.length] }} />
                  </div>
                </button>
              );
            })}
          </div>
        </ChartCard>

        <div className="xl:col-span-2">
          <ChartCard title="Smart Alerts and Project Register - التنبيهات وسجل المشاريع" icon={AlertTriangle} color="#ef4444" delay={0.48}>
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">No critical alerts in this snapshot.</div>
              ) : alerts.slice(0, 4).map((alert, index) => (
                <button
                  key={`${alert.project}-${index}`}
                  onClick={() => setSelectedProject(alert.project)}
                  className="rounded-xl border p-4 text-left transition hover:opacity-90"
                  style={{
                    background: alert.type === "critical" ? "#ef444411" : "#f59e0b11",
                    borderColor: alert.type === "critical" ? "#ef444433" : "#f59e0b33",
                  }}
                >
                  <div className="mb-1 text-xs font-black text-white">{alert.message}</div>
                  <div className="text-[10px] text-slate-500">Open project detail</div>
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <div className="grid grid-cols-[1fr_1fr_110px_110px_110px] bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                    className="grid w-full grid-cols-[1fr_1fr_110px_110px_110px] border-t border-white/[0.04] px-3 py-2 text-left text-xs transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white">{project.code}</div>
                      <div className="truncate text-[10px] text-slate-500">{project.name}</div>
                    </div>
                    <div className="truncate text-slate-400">{project.client}</div>
                    <div className="text-right font-mono text-green-300">{fmtMoney(project.approvedNet)}</div>
                    <div className="text-right font-mono text-amber-300">{fmtMoney(project.collected)}</div>
                    <div className="text-right font-mono text-red-300">{fmtMoney(outstanding)}</div>
                  </button>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </div>
      )}

      {showTables && <ProjectPanel projectCode={selectedProject} invoices={invoices} onClose={() => setSelectedProject(null)} />}

      <footer className="border-t border-white/[0.04] pt-4 text-center">
        <p className="text-[11px] text-slate-600">
          IPC Board Dashboard - Read-only online snapshot - {new Date().toLocaleString("en-GB")}
        </p>
      </footer>
    </div>
  );
}
