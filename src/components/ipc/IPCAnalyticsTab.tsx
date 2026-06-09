import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart2,
  Building,
  Gauge,
  Layers,
  Map as MapIcon,
  PieChart as PieIcon,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { fmtCompact, fmtNum, fmtPercent } from "@/lib/utils";
import { type Invoice } from "@/hooks/useIPC";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#14b8a6", "#ec4899"];

interface Props {
  invoices: Invoice[];
  projects?: any[];
}

function money(value: number) {
  return fmtCompact(value || 0);
}

function fullMoney(value: number) {
  return fmtNum(value || 0, 0);
}

function safeArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function toFiniteNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function textValue(value: unknown, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeChartRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.filter((row) =>
    Object.values(row).every((value) => typeof value !== "number" || Number.isFinite(value))
  );
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

function ChartCard({
  title,
  titleAr,
  icon: Icon,
  children,
  span = false,
}: {
  title: string;
  titleAr?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm ${span ? "xl:col-span-2" : ""}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black">
        <Icon size={16} className="text-[#c5a880]" />
        {title}
        {titleAr && <span className="text-xs font-medium text-muted-foreground">/ {titleAr}</span>}
      </h3>
      {children}
    </section>
  );
}

export function IPCAnalyticsTab({ invoices }: Props) {
  const financial = useFinancialSnapshot();

  const gapData = useMemo(() => financial.projects
    .map((project) => ({
      project: project.project_code,
      submitted: project.submitted_total,
      approved: project.approved_net,
      gap: Math.max(project.submitted_total - project.approved_net, 0),
      gapPct: project.submitted_total > 0 ? Math.max((project.submitted_total - project.approved_net) / project.submitted_total, 0) : 0,
      client: project.client,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 12), [financial.projects]);

  const clientData = useMemo(() => {
    const map = new Map<string, { client: string; approved: number; collected: number; outstanding: number; forecast: number }>();
    financial.projects.forEach((project) => {
      const row = map.get(project.client) || { client: project.client, approved: 0, collected: 0, outstanding: 0, forecast: 0 };
      row.approved += project.approved_net;
      row.collected += project.actual_collected;
      row.outstanding += project.outstanding;
      row.forecast += project.forecast_cash_in;
      map.set(project.client, row);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  }, [financial.projects]);

  const statusData = useMemo(() => {
    const order = ["معتمد", "تحت الاعتماد", "في انتظار النسخة المعتمدة", "لم يتم اعتماد السابق", "draft"];
    const map = new Map<string, { status: string; count: number; submitted: number }>();
    invoices.forEach((invoice) => {
      const status = textValue(invoice.status);
      const row = map.get(status) || { status, count: 0, submitted: 0 };
      row.count += 1;
      row.submitted += toFiniteNumber(invoice.work_current || invoice.work_total);
      map.set(status, row);
    });
    return Array.from(map.values()).sort((a, b) => {
      const ai = order.indexOf(a.status);
      const bi = order.indexOf(b.status);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || b.submitted - a.submitted;
    });
  }, [invoices]);

  const deductionData = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((invoice) => {
      [...safeArray(invoice.deductions_breakdown), ...safeArray(invoice.approved_deductions_breakdown)].forEach((item) => {
        if (!item || typeof item !== "object") return;
        const row = item as { name?: string; amount?: number };
        const name = textValue(row.name, "Other").slice(0, 28);
        map.set(name, (map.get(name) || 0) + toFiniteNumber(row.amount));
      });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [invoices]);

  const cumulativeData = useMemo(() => financial.monthly.map((month) => ({
    month: month.month,
    submitted: month.submitted,
    approved: month.approved,
    collected: month.actualCollected,
    netActual: month.cumulativeActual,
    netForecast: month.cumulativeForecast,
  })), [financial.monthly]);

  const riskData = financial.controlIssues.slice(0, 10);

  // §6.2 Q5 — Approval delay analysis by client
  const approvalDelayData = useMemo(() => {
    const clientDelays = new Map<string, { client: string; totalDays: number; count: number; avgDays: number }>();
    invoices.forEach((inv) => {
      if (!inv.submitted_date || !inv.approval_date) return;
      const days = Math.floor(
        (new Date(inv.approval_date).getTime() - new Date(inv.submitted_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) return;
      const client = textValue(inv.client);
      const row = clientDelays.get(client) || { client, totalDays: 0, count: 0, avgDays: 0 };
      row.totalDays += days;
      row.count += 1;
      row.avgDays = Math.round(row.totalDays / row.count);
      clientDelays.set(client, row);
    });
    return safeChartRows(Array.from(clientDelays.values()))
      .filter((r) => r.count >= 1)
      .sort((a, b) => b.avgDays - a.avgDays)
      .slice(0, 10);
  }, [invoices]);

  // §6.2 Q2 — Collection efficiency ranking by client
  const collectionEffData = useMemo(() => {
    return safeChartRows(clientData
      .filter((c) => c.approved > 0)
      .map((c) => ({
        client: c.client,
        approved: c.approved,
        collected: c.collected,
        outstanding: c.outstanding,
        efficiency: c.approved > 0 ? c.collected / c.approved : 0,
      }))
    )
      .sort((a, b) => a.efficiency - b.efficiency)
      .slice(0, 10);
  }, [clientData]);

  // §6.2 Q3 — Projects creating cash stress (high outstanding + low collection rate)
  const cashStressData = useMemo(() => {
    return safeChartRows(financial.projects
      .filter((p) => p.outstanding > 0 && p.approved_net > 0)
      .map((p) => ({
        project: p.project_code,
        outstanding: p.outstanding,
        collectionRate: p.approved_net > 0 ? p.actual_collected / p.approved_net : 0,
        stressScore: p.outstanding * (1 - (p.approved_net > 0 ? p.actual_collected / p.approved_net : 0)),
      }))
    )
      .sort((a, b) => b.stressScore - a.stressScore)
      .slice(0, 10);
  }, [financial.projects]);

  // ─── NEW: Sector Revenue Breakdown ───
  const sectorData = useMemo(() => {
    const map = new Map<string, { sector: string; contractValue: number; submitted: number; approved: number; count: number }>();
    financial.projects.forEach((p) => {
      const sector = p.sector || "Other";
      const row = map.get(sector) || { sector, contractValue: 0, submitted: 0, approved: 0, count: 0 };
      row.contractValue += p.contract_value;
      row.submitted += p.submitted_total;
      row.approved += p.approved_net;
      row.count += 1;
      map.set(sector, row);
    });
    return Array.from(map.values()).sort((a, b) => b.contractValue - a.contractValue);
  }, [financial.projects]);

  // ─── NEW: Monthly Invoice Volume ───
  const monthlyVolume = useMemo(() => {
    const map = new Map<string, { month: string; sortKey: string; invoiceCount: number; submittedValue: number; approvedValue: number; collectionValue: number }>();
    invoices.forEach((inv) => {
      const raw = inv.submitted_date || inv.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const row = map.get(key) || { month: label, sortKey: key, invoiceCount: 0, submittedValue: 0, approvedValue: 0, collectionValue: 0 };
      row.invoiceCount += 1;
      row.submittedValue += toFiniteNumber(inv.work_current || inv.work_total);
      row.approvedValue += toFiniteNumber(inv.approved_current || inv.approved_total);
      row.collectionValue += toFiniteNumber(inv.total_collections);
      map.set(key, row);
    });
    return safeChartRows(Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey)));
  }, [invoices]);

  // ─── NEW: Client Concentration ───
  const clientConcentration = useMemo(() => {
    const totalContract = financial.portfolio.total_contract_value || 1;
    const clients = clientData.map((c) => ({
      ...c,
      share: c.approved / (financial.portfolio.total_approved_net || 1),
    }));
    // Herfindahl-Hirschman Index
    const hhi = clients.reduce((sum, c) => sum + (c.share * 100) ** 2, 0);
    return { clients, hhi: Math.round(hhi), totalContract };
  }, [clientData, financial.portfolio]);

  // ─── NEW: Contract Utilization ───
  const contractUtilization = useMemo(() => {
    return financial.projects
      .filter((p) => p.contract_value > 0)
      .map((p) => ({
        project: p.project_code,
        projectName: p.project_name,
        client: p.client,
        contractValue: p.contract_value,
        billed: p.submitted_total,
        utilization: p.submitted_total / p.contract_value,
        collected: p.actual_collected,
        collectionRate: p.approved_net > 0 ? p.actual_collected / p.approved_net : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 15);
  }, [financial.projects]);

  // ─── NEW: Revenue Waterfall ───
  const waterfallData = useMemo(() => {
    const p = financial.portfolio;
    return [
      { name: "Contract Value", value: p.total_contract_value, fill: "#3b82f6" },
      { name: "Submitted", value: p.total_submitted, fill: "#60a5fa" },
      { name: "Approved Gross", value: p.total_approved, fill: "#22c55e" },
      { name: "Deductions", value: p.total_approved - p.total_approved_net, fill: "#ef4444" },
      { name: "Approved Net", value: p.total_approved_net, fill: "#10b981" },
      { name: "Collected", value: p.total_collections, fill: "#f59e0b" },
      { name: "Outstanding", value: p.total_outstanding, fill: "#f87171" },
    ];
  }, [financial.portfolio]);

  return (
    <div className="space-y-6">
      {/* ─── Board Executive Summary ─── */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/80 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-black">
          <Gauge size={18} className="text-[#c5a880]" />
          Board Executive Summary / ملخص تنفيذي لمجلس الإدارة
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="text-[10px] font-bold uppercase text-blue-400">Total Contracts</div>
            <div className="font-mono text-lg font-black">{money(financial.portfolio.total_contract_value)}</div>
            <div className="text-[10px] text-muted-foreground">{financial.portfolio.project_count} projects</div>
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <div className="text-[10px] font-bold uppercase text-sky-400">YTD Submitted</div>
            <div className="font-mono text-lg font-black">{money(financial.portfolio.total_submitted)}</div>
            <div className="text-[10px] text-muted-foreground">{invoices.length} invoices</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-[10px] font-bold uppercase text-emerald-400">YTD Approved Net</div>
            <div className="font-mono text-lg font-black">{money(financial.portfolio.total_approved_net)}</div>
            <div className="text-[10px] text-muted-foreground">{fmtPercent(financial.portfolio.total_submitted ? financial.portfolio.total_approved_net / financial.portfolio.total_submitted : 0)} conversion</div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="text-[10px] font-bold uppercase text-amber-400">YTD Collected</div>
            <div className="font-mono text-lg font-black">{money(financial.portfolio.total_collections)}</div>
            <div className="text-[10px] text-muted-foreground">{fmtPercent(financial.portfolio.overall_collection_rate)} efficiency</div>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="text-[10px] font-bold uppercase text-red-400">Outstanding</div>
            <div className="font-mono text-lg font-black">{money(financial.portfolio.total_outstanding)}</div>
            <div className="text-[10px] text-muted-foreground">Receivable balance</div>
          </div>
          <div className="rounded-lg border border-[#c5a880]/20 bg-[#c5a880]/5 p-3">
            <div className="text-[10px] font-bold uppercase text-[#c5a880]">Health Score</div>
            <div className="font-mono text-lg font-black">{financial.readiness.score}/100</div>
            <div className="text-[10px] text-muted-foreground">{financial.readiness.issueCount} issues</div>
          </div>
        </div>
      </div>

      {/* ─── NEW: Revenue Waterfall ─── */}
      <ChartCard title="Revenue Waterfall" titleAr="شلال الإيرادات" icon={TrendingUp} span>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfallData} barSize={45}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ─── NEW: Monthly Invoice Volume Trend ─── */}
      <ChartCard title="Monthly Invoice Volume (Jan–Jun 2026)" titleAr="حجم المستخلصات الشهري" icon={TrendingUp} span>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={money} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Area yAxisId="left" dataKey="submittedValue" name="Submitted Value" stroke="#3b82f6" fill="#3b82f622" strokeWidth={2} />
            <Area yAxisId="left" dataKey="approvedValue" name="Approved Value" stroke="#22c55e" fill="#22c55e22" strokeWidth={2} />
            <Area yAxisId="left" dataKey="collectionValue" name="Collections" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={2} />
            <Bar yAxisId="right" dataKey="invoiceCount" name="Invoice Count" fill="#a855f766" barSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <ChartCard title="Approval Gap Analysis" titleAr="فجوة الاعتماد" icon={BarChart2} span>
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={gapData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="project" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[5, 5, 0, 0]} />
            <Bar dataKey="approved" name="Approved Net" fill="#22c55e" radius={[5, 5, 0, 0]} />
            <Bar dataKey="gap" name="Gap" fill="#ef4444" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {gapData.slice(0, 6).map((row) => (
            <div key={row.project} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black">{row.project}</span>
                <span className={row.gapPct > 0.25 ? "text-red-500" : "text-amber-500"}>{fmtPercent(row.gapPct)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{row.client} / gap {money(row.gap)}</div>
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Client Receivable Control" titleAr="تحصيل العملاء" icon={Wallet}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={clientData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="client" width={125} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="approved" name="Approved Net" fill="#22c55e88" />
            <Bar dataKey="collected" name="Collected" fill="#f59e0b" />
            <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" />
            <Line dataKey="forecast" name="Forecast In" stroke="#14b8a6" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Actual And Forecast Position" titleAr="المركز الفعلي والمتوقع" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Area dataKey="netActual" name="Cumulative Actual Net" stroke="#3b82f6" fill="#3b82f633" strokeWidth={2} />
            <Area dataKey="netForecast" name="Actual + Forecast Net" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Status Priority" titleAr="ترتيب الحالات" icon={PieIcon}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ResponsiveContainer width="100%" height={245}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {statusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {statusData.map((row, index) => (
              <div key={row.status} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="truncate">{row.status}</span>
                </span>
                <span className="font-mono font-black">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* §6.2 Q5: Approval delay by client */}
      <ChartCard title="Approval Delay by Client" titleAr="تأخير الاعتماد بالعميل" icon={AlertTriangle}>
        {approvalDelayData.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No approval timing data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={approvalDelayData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" unit=" d" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="client" width={125} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="avgDays" name="Avg Days to Approve" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Deduction Concentration" titleAr="تركيز الاستقطاعات" icon={Layers}>
        {deductionData.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">No detailed deduction rows found.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deductionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Deduction" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* §6.2 Q2: Collection efficiency ranking */}
      <ChartCard title="Collection Efficiency Ranking" titleAr="ترتيب كفاءة التحصيل" icon={Wallet}>
        {collectionEffData.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No collection data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-2 py-2 font-bold">Client</th>
                  <th className="px-2 py-2 text-right font-bold">Approved</th>
                  <th className="px-2 py-2 text-right font-bold">Collected</th>
                  <th className="px-2 py-2 text-right font-bold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {collectionEffData.map((row) => (
                  <tr key={row.client} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-2 py-2 font-bold">{row.client}</td>
                    <td className="px-2 py-2 text-right font-mono">{money(row.approved)}</td>
                    <td className="px-2 py-2 text-right font-mono">{money(row.collected)}</td>
                    <td className={`px-2 py-2 text-right font-mono font-black ${row.efficiency < 0.5 ? "text-red-500" : row.efficiency < 0.8 ? "text-amber-500" : "text-emerald-500"}`}>
                      {fmtPercent(row.efficiency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* §6.2 Q3: Cash stress projects */}
      <ChartCard title="Cash Stress Projects" titleAr="مشاريع ضغط السيولة" icon={AlertTriangle}>
        {cashStressData.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No cash stress detected.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashStressData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="project" width={75} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Control Risk Queue" titleAr="قائمة مخاطر الرقابة" icon={AlertTriangle}>
        {riskData.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-500">
            No critical financial control issues in current data.
          </div>
        ) : (
          <div className="space-y-2">
            {riskData.map((issue) => (
              <div
                key={`${issue.code}-${issue.project_code || "portfolio"}-${issue.detail}`}
                className={`rounded-lg border px-3 py-2 ${
                  issue.severity === "critical" || issue.severity === "high"
                    ? "border-red-500/25 bg-red-500/5"
                    : "border-amber-500/25 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black">{issue.title}</span>
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-black uppercase">{issue.severity}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{issue.detail}</p>
                {issue.value !== undefined && <div className="mt-1 font-mono text-xs font-black">{fullMoney(issue.value)}</div>}
                {issue.suggested_action && (
                  <p className="mt-1.5 text-[10px] font-medium text-blue-400">→ {issue.suggested_action}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <ChartCard title="Top Contract Exposure" titleAr="أكبر تعرض تعاقدي" icon={Target} span>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={[...financial.projects].sort((a, b) => b.contract_value - a.contract_value).slice(0, 12)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="project_code" width={75} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="contract_value" name="Contract Value" fill="#3b82f6" />
            <Bar dataKey="submitted_total" name="Submitted" fill="#f59e0b" />
            <Bar dataKey="approved_net" name="Approved Net" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    {/* ═══ NEW BOARD-LEVEL SECTION ═══ */}
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* ─── Sector Revenue Breakdown ─── */}
      <ChartCard title="Sector Revenue Breakdown" titleAr="توزيع الإيرادات حسب القطاع" icon={MapIcon}>
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={sectorData} dataKey="contractValue" nameKey="sector" innerRadius={45} outerRadius={90} paddingAngle={3}>
                {sectorData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {sectorData.map((row, index) => (
              <div key={row.sector} className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="font-bold">{row.sector}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{row.count} proj</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Contract: {money(row.contractValue)} • Submitted: {money(row.submitted)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* ─── Client Concentration Risk ─── */}
      <ChartCard title="Client Concentration Risk" titleAr="مخاطر تركز العملاء" icon={Building}>
        <div className="mb-3 flex items-center gap-3">
          <div className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            clientConcentration.hhi > 2500 ? "border border-red-500/20 bg-red-500/10 text-red-400" :
            clientConcentration.hhi > 1500 ? "border border-amber-500/20 bg-amber-500/10 text-amber-400" :
            "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}>
            HHI: {clientConcentration.hhi}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {clientConcentration.hhi > 2500 ? "High concentration risk" : clientConcentration.hhi > 1500 ? "Moderate concentration" : "Well diversified"}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={clientConcentration.clients.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => fmtPercent(v)} tick={{ fontSize: 10 }} domain={[0, 1]} />
            <YAxis type="category" dataKey="client" width={120} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="share" name="Portfolio Share" radius={[0, 6, 6, 0]}>
              {clientConcentration.clients.slice(0, 8).map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    {/* ─── Contract Utilization ─── */}
    <ChartCard title="Contract Utilization" titleAr="نسبة استخدام العقود" icon={Gauge} span>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {contractUtilization.map((row) => {
          const pct = Math.min(row.utilization * 100, 100);
          const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
          return (
            <div key={row.project} className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#c5a880]">{row.project}</span>
                <span className="font-mono text-muted-foreground">{fmtPercent(row.utilization)}</span>
              </div>
              <div className="mt-1 truncate text-[10px] text-muted-foreground">{row.client}</div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>Billed {money(row.billed)}</span>
                <span>of {money(row.contractValue)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
    </div>
  );
}
