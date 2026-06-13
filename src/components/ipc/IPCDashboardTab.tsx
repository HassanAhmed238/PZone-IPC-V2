import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  Filter,
  LineChart as LineChartIcon,
  Share2,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact, fmtNum, fmtPercent } from "@/lib/utils";
import { type Invoice } from "@/hooks/useIPC";
import { type FinancialSnapshotFilters, useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useCollectionMutation } from "@/hooks/useCollectionMutation";
import { CollectionEditPopover, type EditableField } from "@/components/ipc/CollectionEditPopover";
import { useMonthlyOverrides } from "@/hooks/useMonthlyOverrides";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#14b8a6"];

interface Props {
  invoices: Invoice[];
  isLoading?: boolean;
  onProjectClick: (code: string) => void;
  onShare?: () => void;
}

function money(value: number) {
  return fmtCompact(value || 0);
}

function fullMoney(value: number) {
  return fmtNum(value || 0, 0);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-xl">
      {label && <div className="mb-2 font-black text-muted-foreground">{label}</div>}
      {payload.map((item: any) => (
        <div key={item.dataKey || item.name} className="flex items-center justify-between gap-5 py-0.5">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-mono font-black">{typeof item.value === "number" ? fullMoney(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  titleAr,
  icon: Icon,
  children,
  className = "",
  badge,
}: {
  title: string;
  titleAr?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black">
        <Icon size={16} className="text-[#c5a880]" />
        <span>{title}</span>
        {titleAr && <span className="text-xs font-medium text-muted-foreground">/ {titleAr}</span>}
        {badge && <span className="ml-auto">{badge}</span>}
      </h3>
      {children}
    </section>
  );
}

function Kpi({
  label,
  labelAr,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  labelAr: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-[10px] text-muted-foreground">{labelAr}</div>
        </div>
        <div className="rounded-lg bg-muted p-2" style={{ color: tone }}>
          <Icon size={16} />
        </div>
      </div>
      <div className="font-mono text-2xl font-black">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </motion.div>
  );
}

function SelectFilter({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-[#c5a880]"
      >
        <option value="">All</option>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

export function IPCDashboardTab({ invoices, isLoading, onProjectClick, onShare }: Props) {
  const [project, setProject] = useState("");
  const [client, setClient] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Inline chart editing — collection, submitted, approved
  const [editingMonth, setEditingMonth] = useState<{
    monthKey: string;
    monthLabel: string;
    currentValue: number;
    field: EditableField;
    x: number;
    y: number;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const collectionMutation = useCollectionMutation();
  const { applyOverrides, setOverride, clearOverride, hasOverride } = useMonthlyOverrides();

  const handleDotClick = useCallback(
    (field: EditableField, payload: any, cx: number, cy: number) => {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      const screenX = (rect?.left ?? 0) + cx;
      const screenY = (rect?.top ?? 0) + cy;
      const currentValue =
        field === "submitted" ? (payload.submitted ?? 0)
        : field === "approved" ? (payload.approved ?? 0)
        : (payload.actualCollected ?? 0);
      setEditingMonth({ monthKey: payload.monthKey, monthLabel: payload.month, currentValue, field, x: screenX, y: screenY });
    },
    [],
  );

  const handleSave = useCallback(
    (monthKey: string, newTotal: number, currentTotal: number) => {
      if (!editingMonth) return;
      const { field } = editingMonth;
      // Always set the local override for instant display feedback
      setOverride(field, monthKey, newTotal);
      setEditingMonth(null);
      // For collection: also persist to Supabase in the background as audit trail
      if (field === "collection") {
        collectionMutation.mutate({ monthKey, newTotal, currentTotal });
      }
    },
    [editingMonth, collectionMutation, setOverride],
  );

  const handleReset = useCallback(
    (monthKey: string) => {
      if (!editingMonth) return;
      clearOverride(editingMonth.field, monthKey);
      setEditingMonth(null);
    },
    [editingMonth, clearOverride],
  );

  const filterOptions = useMemo(() => {
    const unique = (values: Array<string | null | undefined>) =>
      [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return {
      projects: unique(invoices.map((invoice) => invoice.project_code)),
      clients: unique(invoices.map((invoice) => invoice.client || "Unknown")),
      sectors: unique(invoices.map((invoice) => invoice.sector || "Other")),
      statuses: unique(invoices.map((invoice) => invoice.status)),
    };
  }, [invoices]);

  const filters = useMemo<FinancialSnapshotFilters>(() => ({
    projectCodes: project ? [project] : undefined,
    clients: client ? [client] : undefined,
    sectors: sector ? [sector] : undefined,
    statuses: status ? [status] : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [project, client, sector, status, dateFrom, dateTo]);

  const financial = useFinancialSnapshot(filters);
  const { portfolio } = financial;

  // Merge all local overrides (submitted, approved, collection) into display data
  const displayMonthly = applyOverrides(financial.monthly);

  const clientEfficiency = useMemo(() => {
    const map = new Map<string, { client: string; approved: number; collected: number; outstanding: number; efficiency: number }>();
    financial.projects.forEach((row) => {
      const current = map.get(row.client) || { client: row.client, approved: 0, collected: 0, outstanding: 0, efficiency: 0 };
      current.approved += row.approved_net;
      current.collected += row.actual_collected;
      current.outstanding += row.outstanding;
      current.efficiency = current.approved > 0 ? current.collected / current.approved : 0;
      map.set(row.client, current);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  }, [financial.projects]);

  const cashChart = displayMonthly.map((row) => ({
    month: row.month,
    "Actual In": row.actualCollected,
    "Actual Out": -row.actualCashOut,
    "Forecast In": row.forecastCashIn,
    "Forecast Out": -row.forecastCashOut,
    "Net Forecast": row.netForecast,
  }));

  if (isLoading || financial.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading financial dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black">
              <ShieldCheck size={18} className="text-[#c5a880]" />
              IPC Control Dashboard / لوحة تحكم المستخلصات
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ledger-backed view for submitted, approved, collected, forecast, and control flags.
            </p>
          </div>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-2 rounded-lg border border-[#c5a880]/30 px-3 py-2 text-xs font-black text-[#c5a880] hover:bg-[#c5a880]/10"
          >
            <Share2 size={14} />
            Share Board
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SelectFilter label="Project" value={project} values={filterOptions.projects} onChange={setProject} />
          <SelectFilter label="Client" value={client} values={filterOptions.clients} onChange={setClient} />
          <SelectFilter label="Sector" value={sector} values={filterOptions.sectors} onChange={setSector} />
          <SelectFilter label="Status" value={status} values={filterOptions.statuses} onChange={setStatus} />
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">From</span>
            <input type="month" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-[#c5a880]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">To</span>
            <input type="month" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-[#c5a880]" />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Contract Value" labelAr="قيمة العقود" value={money(portfolio.total_contract_value)} sub={`${portfolio.project_count} projects`} icon={Building2} tone="#3b82f6" />
        <Kpi label="Submitted" labelAr="المقدم" value={money(portfolio.total_submitted)} sub="Latest IPC per project" icon={FileSpreadsheet} tone="#60a5fa" />
        <Kpi label="Approved Net" labelAr="المعتمد الصافي" value={money(portfolio.total_approved_net)} sub={`${fmtPercent(portfolio.total_submitted ? portfolio.total_approved_net / portfolio.total_submitted : 0)} of submitted`} icon={CheckCircle2} tone="#22c55e" />
        <Kpi label="Collected" labelAr="المحصل" value={money(portfolio.total_collections)} sub={`${fmtPercent(portfolio.overall_collection_rate)} collection efficiency`} icon={Wallet} tone="#f59e0b" />
        <Kpi label="Outstanding" labelAr="المتبقي للتحصيل" value={money(portfolio.total_outstanding)} sub={`${portfolio.total_over_collected > 0 ? money(portfolio.total_over_collected) + " over-collected" : "approved receivable"}`} icon={TrendingDown} tone="#ef4444" />
        <Kpi label="Forecast Cash-In" labelAr="المتوقع تحصيله" value={money(portfolio.total_forecast_cash_in)} sub="Weighted expected inflow" icon={TrendingUp} tone="#14b8a6" />
        <Kpi label="Cash Out" labelAr="مصروفات فعلية" value={money(portfolio.total_cash_out)} sub={`${money(portfolio.total_forecast_cash_out)} planned out`} icon={BarChart3} tone="#a855f7" />
        <Kpi label="Readiness" labelAr="جاهزية الرقابة" value={`${financial.readiness.score}/100`} sub={`${financial.readiness.issueCount} control issue(s)`} icon={Database} tone={financial.readiness.blockingIssues ? "#ef4444" : "#22c55e"} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          title="Submitted vs Approved vs Collected"
          titleAr="المقدم والمعتمد والمحصل"
          icon={LineChartIcon}
          badge={
            <span className="flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400/80">TOTAL</span>
              <span className="font-mono text-sm font-black text-yellow-300">
                {fullMoney(portfolio.total_collections)}
              </span>
            </span>
          }
        >
          <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]"></span>
              <span>Click dots to edit</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]"></span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]"></span>
            </span>
          </div>
          <div ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                {portfolio.total_collections > 0 && (
                  <ReferenceLine
                    y={portfolio.total_collections}
                    stroke="#fde047"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `TOTAL ${money(portfolio.total_collections)}`,
                      position: "insideTopRight",
                      fill: "#fde047",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="submitted"
                  name="Submitted"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle key={key} cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDotClick("submitted", payload, cx, cy)}
                      />
                    );
                  }}
                  activeDot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle key={key} cx={cx} cy={cy} r={7} fill="#3b82f6" stroke="#fff" strokeWidth={3}
                        style={{ cursor: "pointer", filter: "drop-shadow(0 0 4px rgba(59,130,246,0.6))" }}
                        onClick={() => handleDotClick("submitted", payload, cx, cy)}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle key={key} cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDotClick("approved", payload, cx, cy)}
                      />
                    );
                  }}
                  activeDot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle key={key} cx={cx} cy={cy} r={7} fill="#22c55e" stroke="#fff" strokeWidth={3}
                        style={{ cursor: "pointer", filter: "drop-shadow(0 0 4px rgba(34,197,94,0.6))" }}
                        onClick={() => handleDotClick("approved", payload, cx, cy)}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actualCollected"
                  name="Collected"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle
                        key={key} cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDotClick("collection", payload, cx, cy)}
                      />
                    );
                  }}
                  activeDot={(dotProps: any) => {
                    const { cx, cy, payload, key } = dotProps;
                    return (
                      <circle
                        key={key} cx={cx} cy={cy} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={3}
                        style={{ cursor: "pointer", filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))" }}
                        onClick={() => handleDotClick("collection", payload, cx, cy)}
                      />
                    );
                  }}
                />
                <Line type="monotone" dataKey="forecastCashIn" name="Forecast In" stroke="#14b8a6" strokeDasharray="5 4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {editingMonth && (
            <CollectionEditPopover
              x={editingMonth.x}
              y={editingMonth.y}
              monthLabel={editingMonth.monthLabel}
              monthKey={editingMonth.monthKey}
              currentValue={editingMonth.currentValue}
              field={editingMonth.field}
              isOverridden={hasOverride(editingMonth.field, editingMonth.monthKey)}
              onSave={handleSave}
              onReset={handleReset}
              onClose={() => setEditingMonth(null)}
              isSaving={editingMonth.field === "collection" && collectionMutation.isPending}
            />
          )}
        </Panel>

        <Panel title="Actual + Forecast Cashflow" titleAr="التدفق النقدي الفعلي والمتوقع" icon={Wallet}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cashChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="Actual In" fill="#22c55e" />
              <Bar dataKey="Actual Out" fill="#ef4444" />
              <Bar dataKey="Forecast In" fill="#14b8a6" />
              <Bar dataKey="Forecast Out" fill="#f97316" />
              <Line type="monotone" dataKey="Net Forecast" stroke="#c5a880" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Aging Buckets" titleAr="أعمار المديونية" icon={Clock}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financial.aging}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="days" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>
                {financial.aging.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Outstanding Projects" titleAr="أعلى أرصدة مفتوحة" icon={Target}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financial.projects.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="project_code" tick={{ fontSize: 11 }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Collection Efficiency By Client" titleAr="كفاءة التحصيل حسب العميل" icon={Filter} className="xl:col-span-1">
          <div className="space-y-3">
            {clientEfficiency.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No posted collection data yet.</p>
            ) : clientEfficiency.map((row) => (
              <div key={row.client} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-bold">{row.client}</span>
                  <span className="font-mono text-muted-foreground">{fmtPercent(row.efficiency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${Math.min(row.efficiency * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Collected {money(row.collected)}</span>
                  <span>Open {money(row.outstanding)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="5.5 Control & Reconciliation" titleAr="الرقابة والمطابقة" icon={AlertTriangle} className="xl:col-span-2">
          {financial.controlIssues.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-500">
              No critical reconciliation flags in the current scope.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {financial.controlIssues.slice(0, 8).map((issue) => (
                <button
                  key={`${issue.code}-${issue.project_code || "portfolio"}-${issue.detail}`}
                  type="button"
                  onClick={() => issue.project_code && onProjectClick(issue.project_code)}
                  className={`rounded-lg border p-3 text-left transition hover:opacity-90 ${
                    issue.severity === "critical"
                      ? "border-red-500/25 bg-red-500/5"
                      : issue.severity === "warning"
                        ? "border-amber-500/25 bg-amber-500/5"
                        : "border-blue-500/25 bg-blue-500/5"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-black">{issue.title}</span>
                    <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase">{issue.severity}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{issue.detail}</p>
                  {issue.value !== undefined && <div className="mt-2 font-mono text-xs font-black">{fullMoney(issue.value)}</div>}
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Project Financial Matrix" titleAr="مصفوفة المشاريع المالية" icon={Calendar}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2 text-right">Contract</th>
                <th className="px-3 py-2 text-right">Submitted</th>
                <th className="px-3 py-2 text-right">Approved Net</th>
                <th className="px-3 py-2 text-right">Collected</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2 text-right">Forecast In</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {financial.projects.map((row) => (
                <tr key={row.project_code} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <button onClick={() => onProjectClick(row.project_code)} className="font-black text-[#c5a880] hover:underline">
                      {row.project_code}
                    </button>
                    <div className="max-w-[260px] truncate text-[10px] text-muted-foreground">{row.project_name}</div>
                  </td>
                  <td className="px-3 py-2">{row.client}</td>
                  <td className="px-3 py-2 text-right font-mono">{fullMoney(row.contract_value)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fullMoney(row.submitted_total)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fullMoney(row.approved_net)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fullMoney(row.actual_collected)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">{fullMoney(row.outstanding)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fullMoney(row.forecast_cash_in)}</td>
                  <td className="px-3 py-2">
                    {row.flags.length === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.flags.map((flag) => (
                          <span key={flag} className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-500">
                            {flag.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
