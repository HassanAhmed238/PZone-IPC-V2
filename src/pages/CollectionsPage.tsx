import { useState, useMemo } from "react";
import {
  Wallet, BarChart3, Calendar, FolderKanban, TrendingUp,
  Download, Search, ChevronUp, ChevronDown, ArrowUpRight,
  Clock, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell, PieChart, Pie,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollections, useAllInvoicesForCollections, useCollectionAnalytics, CollectionRecord } from "@/hooks/useCollections";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  if (!n) return "-";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
// ─── sub-components ──────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// Aging colors
const AGING_COLORS = [
  "hsl(142, 71%, 45%)",   // 0-30: green
  "hsl(45, 93%, 47%)",    // 31-60: yellow
  "hsl(25, 90%, 55%)",    // 61-90: orange
  "hsl(0, 72%, 50%)",     // 91-120: red
  "hsl(0, 84%, 40%)",     // 120+: dark red
];

// ─── main page ───────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const [tab, setTab] = useState<"monthly" | "project" | "aging">("monthly");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("total_collected");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: collected = [], isLoading } = useCollections();
  const { data: allInvoices = [] } = useAllInvoicesForCollections();
  
  // Cumulative-safe analytics
  const analytics = useCollectionAnalytics();

  // ── derive available years ─────────────────────────────────────────────
  const years = useMemo(() => {
    const set = new Set<string>();
    analytics.monthly.forEach((m) => {
      if (m.monthKey) set.add(m.monthKey.slice(0, 4));
    });
    collected.forEach((r) => {
      const date = r.approved_date || r.received_date || r.submitted_date;
      if (date) set.add(new Date(date).getFullYear().toString());
    });
    return ["all", ...Array.from(set).sort().reverse()];
  }, [analytics.monthly, collected]);

  // ── filter by year ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return collected.filter((r) => {
      const date = r.approved_date || r.received_date || r.submitted_date;
      if (selectedYear !== "all" && date) {
        if (new Date(date).getFullYear().toString() !== selectedYear) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.project_name.toLowerCase().includes(q) ||
          r.project_code.toLowerCase().includes(q) ||
          (r.zone || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [collected, selectedYear, search]);

  // ── KPIs — use cumulative-safe analytics ──────────────────────────────
  const totalCollected = analytics.totalCollected;
  const totalOutstanding = analytics.totalOutstanding;
  const totalApprovedNet = analytics.totalApprovedNet;
  const collectionRate = analytics.collectionRate * 100;
  const projectCount = analytics.projectsWithCollections;

  // ── per-month aggregation ──────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return analytics.monthly
      .filter((m) => selectedYear === "all" || m.monthKey.startsWith(selectedYear))
      .map((m) => {
        const count = analytics.transactions.filter((t) => {
          const txMonth = (t.collection_month || t.collection_date || "").slice(0, 7);
          if (txMonth !== m.monthKey) return false;
          if (!q) return true;

          return (
            t.project_code.toLowerCase().includes(q) ||
            (t.project_name || "").toLowerCase().includes(q) ||
            (t.client || "").toLowerCase().includes(q)
          );
        }).length;

        return {
          key: m.monthKey,
          label: m.month,
          total: m.actualCollected,
          count,
        };
      })
      .filter((m) => m.total > 0 || m.count > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [analytics.monthly, analytics.transactions, selectedYear, search]);

  // ── per-project aggregation (uses cumulative-safe data) ────────────────
  const projectData = useMemo(() => {
    let arr = analytics.projects.map((p) => ({
      project_code: p.project_code,
      project_name: p.project_name,
      zone: p.sector,
      contract_value: p.contract_value,
      total_invoiced: p.submitted_total,
      total_deductions: p.total_deductions,
      total_net: p.approved_net,
      total_collected: p.total_collections,
      ipc_count: p.ipc_count,
      collection_rate: p.collection_efficiency * 100,
    }));

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (p) => p.project_name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q)
      );
    }

    // Sort
    arr.sort((a, b) => {
      const av = (a as any)[sortCol] ?? 0;
      const bv = (b as any)[sortCol] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return arr;
  }, [analytics.projects, search, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <span className="opacity-20 text-[10px]">↕</span>;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  // ── export ─────────────────────────────────────────────────────────────
  function exportMonthly() {
    const ws = XLSX.utils.json_to_sheet(monthlyData.map((m) => ({
      "الشهر": m.label,
      "إجمالي التحصيلات (ج.م)": m.total,
      "عدد المستخلصات": m.count,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التحصيلات الشهرية");
    XLSX.writeFile(wb, "التحصيلات_الشهرية.xlsx");
    toast.success("تم تصدير البيانات");
  }

  function exportProjects() {
    const ws = XLSX.utils.json_to_sheet(projectData.map((p) => ({
      "كود المشروع": p.project_code,
      "اسم المشروع": p.project_name,
      "المنطقة": p.zone || "",
      "قيمة العقد": p.contract_value,
      "إجمالي المقدم": p.total_invoiced,
      "الخصومات": p.total_deductions,
      "صافي المعتمد": p.total_net,
      "التحصيلات": p.total_collected,
      "نسبة التحصيل %": p.collection_rate.toFixed(1),
      "عدد IPCs": p.ipc_count,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التحصيلات بالمشروع");
    XLSX.writeFile(wb, "التحصيلات_بالمشروع.xlsx");
    toast.success("تم تصدير البيانات");
  }

  // ── chart colors ───────────────────────────────────────────────────────
  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--brand-orange))",
    "hsl(142 71% 45%)",
    "hsl(217 91% 60%)",
    "hsl(280 65% 60%)",
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Wallet className="text-primary" size={28} />
            التحصيلات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تتبع تحصيلات العملاء شهرياً وحسب المشروع
          </p>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedYear === y
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {y === "all" ? "الكل" : y}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          label="إجمالي التحصيلات"
          value={`${fmt(totalCollected)} ج.م`}
          sub={`${projectCount} مشروع`}
          accent
        />
        <KpiCard
          label="نسبة التحصيل"
          value={`${collectionRate.toFixed(1)}%`}
          sub="من صافي المعتمد"
          accent={collectionRate >= 80}
        />
        <KpiCard
          label="المستحقات المتبقية"
          value={`${fmt(totalOutstanding)} ج.م`}
          sub="غير محصلة"
        />
        <KpiCard
          label="صافي المعتمد"
          value={`${fmt(totalApprovedNet)} ج.م`}
          sub="إجمالي المحسوب"
        />
        <KpiCard
          label="عدد التحصيلات"
          value={`${filtered.length}`}
          sub="مستخلص محصّل"
        />
      </div>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly trend line */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-primary" />
              التحصيلات الشهرية (مليون ج.م)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData.map((m) => ({ ...m, total: +(m.total / 1000000).toFixed(2) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} مليون ج.م`, "التحصيل"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 projects bar */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <BarChart3 size={15} className="text-primary" />
              أعلى 5 مشاريع تحصيلاً
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...projectData]
                    .sort((a, b) => b.total_collected - a.total_collected)
                    .slice(0, 5)
                    .map((p) => ({
                      project: p.project_code.length > 10 ? p.project_code.slice(0, 10) + "…" : p.project_code,
                      تحصيل: +(p.total_collected / 1000000).toFixed(2),
                    }))}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="project" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                  <Tooltip
                    formatter={(v: number) => [`${v} مليون ج.م`, "التحصيل"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                  />
                  <Bar dataKey="تحصيل" radius={[0, 4, 4, 0]}>
                    {projectData.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="بحث بالمشروع أو الكود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="monthly" className="gap-1.5">
            <Calendar size={14} /> التحصيلات الشهرية
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5">
            <FolderKanban size={14} /> التحصيلات بالمشروع
          </TabsTrigger>
          <TabsTrigger value="aging" className="gap-1.5">
            <Clock size={14} /> تحليل الأعمار
          </TabsTrigger>
        </TabsList>

        {/* ── Monthly Tab ──────────────────────────────────────────────── */}
        <TabsContent value="monthly">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {monthlyData.length} شهر · {filtered.length} تحصيل
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportMonthly} disabled={monthlyData.length === 0}>
                <Download size={12} /> تصدير
              </Button>
            </div>

            {/* Monthly bar chart in tab */}
            {monthlyData.length > 0 && (
              <div className="p-4 border-b border-border bg-muted/5">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData.map((m) => ({ ...m, total: +(m.total / 1000000).toFixed(2) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        formatter={(v: number) => [`${v} مليون ج.م`, "التحصيل"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="التحصيل" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">الشهر</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">إجمالي التحصيل (ج.م)</th>
                    <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">عدد المستخلصات</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">متوسط التحصيل</th>
                    <th className="py-2.5 px-4 w-28 text-xs font-medium text-muted-foreground text-right">نسبة من الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</td></tr>
                  ) : monthlyData.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد تحصيلات</td></tr>
                  ) : monthlyData.map((m) => {
                    const pct = totalCollected > 0 ? (m.total / totalCollected) * 100 : 0;
                    return (
                      <tr key={m.key} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2.5 px-4 text-sm font-medium text-foreground">{m.label}</td>
                        <td className="py-2.5 px-4 text-sm font-mono text-right text-primary font-semibold">{fmt(m.total)}</td>
                        <td className="py-2.5 px-4 text-xs text-center">{m.count}</td>
                        <td className="py-2.5 px-4 text-xs font-mono text-right text-muted-foreground">
                          {m.count > 0 ? fmt(m.total / m.count) : "-"}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground w-10 text-left">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {monthlyData.length > 0 && (
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">الإجمالي</td>
                      <td className="py-2.5 px-4 text-sm font-mono text-right text-primary">{fmt(totalCollected)}</td>
                      <td className="py-2.5 px-4 text-xs text-center">{filtered.length}</td>
                      <td className="py-2.5 px-4 text-xs font-mono text-right text-muted-foreground">
                        {filtered.length > 0 ? fmt(totalCollected / filtered.length) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Project Tab ──────────────────────────────────────────────── */}
        <TabsContent value="project">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {projectData.length} مشروع
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportProjects} disabled={projectData.length === 0}>
                <Download size={12} /> تصدير
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المنطقة</th>
                    <th
                      className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("project_code")}
                    >
                      <span className="flex items-center gap-1">الكود <SortIcon col="project_code" /></span>
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المشروع</th>
                    <th
                      className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("contract_value")}
                    >
                      <span className="flex items-center gap-1">قيمة العقد <SortIcon col="contract_value" /></span>
                    </th>
                    <th
                      className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("total_net")}
                    >
                      <span className="flex items-center gap-1">صافي المعتمد <SortIcon col="total_net" /></span>
                    </th>
                    <th
                      className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("total_collected")}
                    >
                      <span className="flex items-center gap-1">التحصيلات <SortIcon col="total_collected" /></span>
                    </th>
                    <th
                      className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("collection_rate")}
                    >
                      <span className="flex items-center gap-1 justify-center">نسبة التحصيل <SortIcon col="collection_rate" /></span>
                    </th>
                    <th
                      className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("ipc_count")}
                    >
                      <span className="flex items-center gap-1 justify-center">IPCs <SortIcon col="ipc_count" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">جاري التحميل...</td></tr>
                  ) : projectData.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>
                  ) : projectData.map((p) => {
                    const outstanding = p.total_net - p.total_collected;
                    const rateColor =
                      p.collection_rate >= 80
                        ? "text-green-600 dark:text-green-400"
                        : p.collection_rate >= 50
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-destructive";

                    return (
                      <tr key={p.project_code} className="border-b border-border/50 hover:bg-muted/20 group">
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.zone || "-"}</td>
                        <td className="py-2.5 px-3 text-xs font-mono text-primary">{p.project_code}</td>
                        <td className="py-2.5 px-3 text-xs font-medium max-w-[220px] truncate">{p.project_name}</td>
                        <td className="py-2.5 px-3 text-xs font-mono text-right">{fmt(p.contract_value)}</td>
                        <td className="py-2.5 px-3 text-xs font-mono text-right">{fmt(p.total_net)}</td>
                        <td className="py-2.5 px-3 text-xs font-mono text-right font-semibold text-primary">
                          {p.total_collected > 0 ? fmt(p.total_collected) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-bold ${rateColor}`}>
                              {p.collection_rate.toFixed(1)}%
                            </span>
                            <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.collection_rate >= 80
                                    ? "bg-green-500"
                                    : p.collection_rate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min(p.collection_rate, 100)}%` }}
                              />
                            </div>
                            {outstanding > 0 && (
                              <span className="text-[10px] text-muted-foreground">{fmt(outstanding)} متبقي</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-center font-mono">{p.ipc_count}</td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  {projectData.length > 0 && (
                    <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                      <td colSpan={3} className="py-2.5 px-3 text-xs text-muted-foreground">الإجمالي</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-right">
                        {fmt(projectData.reduce((s, p) => s + p.contract_value, 0))}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-right">
                        {fmt(projectData.reduce((s, p) => s + p.total_net, 0))}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-right text-primary">
                        {fmt(projectData.reduce((s, p) => s + p.total_collected, 0))}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-xs font-bold text-primary">{collectionRate.toFixed(1)}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-center font-mono">
                        {projectData.reduce((s, p) => s + p.ipc_count, 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Aging Analysis Tab ────────────────────────────────────────── */}
        <TabsContent value="aging">
          <div className="space-y-4">
            {/* Aging Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {analytics.aging.map((bucket, i) => (
                <div
                  key={bucket.days}
                  className="rounded-xl border p-4 bg-card"
                  style={{ borderColor: bucket.amount > 0 ? AGING_COLORS[i] + "40" : undefined }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AGING_COLORS[i] }} />
                    <span className="text-xs font-medium text-muted-foreground">{bucket.labelAr}</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">{fmt(bucket.amount)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{bucket.count} مشروع</p>
                </div>
              ))}
            </div>

            {/* Aging Donut Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-brand-orange" />
                  توزيع المستحقات حسب العمر
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.aging.filter(b => b.amount > 0).map((b, i) => ({
                          name: b.labelAr,
                          value: b.amount,
                          color: AGING_COLORS[analytics.aging.indexOf(b)],
                        }))}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" paddingAngle={3}
                      >
                        {analytics.aging.filter(b => b.amount > 0).map((b, i) => (
                          <Cell key={i} fill={AGING_COLORS[analytics.aging.indexOf(b)]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${fmt(v)} ج.م`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">المشاريع حسب فترة التأخير</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">الفترة</th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">المبلغ (ج.م)</th>
                        <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">عدد المشاريع</th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">النسبة</th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">المشاريع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.aging.map((bucket, i) => {
                        const pct = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;
                        return (
                          <tr key={bucket.days} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AGING_COLORS[i] }} />
                                <span className="text-xs font-medium">{bucket.label}</span>
                                <span className="text-[10px] text-muted-foreground">({bucket.labelAr})</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-xs font-mono text-right font-semibold" style={{ color: bucket.amount > 0 ? AGING_COLORS[i] : undefined }}>
                              {bucket.amount > 0 ? fmt(bucket.amount) : "-"}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-center">{bucket.count}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: AGING_COLORS[i] }} />
                                </div>
                                <span className="text-[11px] font-mono text-muted-foreground w-10 text-left">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-[10px] text-muted-foreground max-w-[200px] truncate">
                              {bucket.projects.join(", ") || "-"}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">الإجمالي</td>
                        <td className="py-2.5 px-4 text-xs font-mono text-right text-primary">{fmt(totalOutstanding)}</td>
                        <td className="py-2.5 px-4 text-xs text-center">{analytics.aging.reduce((s, b) => s + b.count, 0)}</td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">100%</td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
