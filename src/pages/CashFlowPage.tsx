import { useState, useMemo } from "react";
import {
  Wallet, TrendingUp, TrendingDown, DollarSign,
  Plus, Download, Search, Calendar, ArrowUpRight, Loader2, Trash2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialAnalytics } from "@/hooks/useFinancialAnalytics";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import {
  useCashFlowStore,
  useCashFlowEntries,
  useCashFlowKPIs,
  useMonthlyCashFlowTrend,
  useCategoryTotals,
  type CashFlowType,
  type CashFlowCategory,
  CATEGORY_META,
} from "@/stores/useCashFlowStore";
import { useInvoices } from "@/hooks/useIPC";
import { useIPCProjects } from "@/hooks/useIPCProjects";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

const NO_PROJECT_VALUE = "__no_project__";
const ALL_PROJECTS_VALUE = "__all_projects__";

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(n: number | null | undefined) {
  if (!n) return "-";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

/* ─── KPI Mini Card ──────────────────────────────────────── */
function KpiMini({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-card transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className="text-xl font-bold font-mono mt-1 text-foreground">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {sub && (
        <div className="flex items-center gap-1 mt-2">
          <ArrowUpRight size={12} style={{ color }} />
          <span className="text-[11px] font-medium" style={{ color }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Add Entry Dialog ───────────────────────────────────── */
function AddEntryDialog() {
  const addEntry = useCashFlowStore((s) => s.addEntry);
  const { data: projects = [] } = useIPCProjects();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    type: "in" as CashFlowType,
    category: "client_collection" as CashFlowCategory,
    project_code: "",
    project_name: "",
    description: "",
    reference: "",
  });

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    addEntry({
      date: form.date,
      amount,
      type: form.type,
      category: form.category,
      project_code: form.project_code || undefined,
      project_name: form.project_name || undefined,
      description: form.description || undefined,
      reference: form.reference || undefined,
    });

    toast.success("تم إضافة القيد بنجاح");
    setOpen(false);
    setForm({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      type: "in",
      category: "client_collection",
      project_code: "",
      project_name: "",
      description: "",
      reference: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus size={14} /> إضافة قيد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة قيد تدفق نقدي</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">التاريخ</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">المبلغ (ج.م)</label>
              <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">النوع</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CashFlowType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">وارد (Cash In)</SelectItem>
                  <SelectItem value="out">صادر (Cash Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">الفئة</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as CashFlowCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.labelAr} ({meta.label})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">المشروع (اختياري)</label>
            <Select value={form.project_code || NO_PROJECT_VALUE} onValueChange={(v) => {
              if (v === NO_PROJECT_VALUE) {
                setForm({ ...form, project_code: "", project_name: "" });
                return;
              }
              const proj = projects.find((p) => p.project_code === v);
              setForm({ ...form, project_code: v, project_name: proj?.project_name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="اختر مشروع..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>بدون مشروع</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.project_code} value={p.project_code}>{p.project_code} - {p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">الوصف</label>
            <Input placeholder="وصف القيد..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">المرجع</label>
            <Input placeholder="رقم الشيك / الحوالة..." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>حفظ القيد</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function CashFlowPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "in" | "out">("all");
  const [filterProject, setFilterProject] = useState("");

  const deleteEntry = useCashFlowStore((s) => s.deleteEntry);
  const importCollections = useCashFlowStore((s) => s.importCollections);
  const snapshot = useFinancialSnapshot();

  const allEntries = useMemo(() => {
    const collectionEntries = snapshot.collections.map((tx) => ({
      id: `ledger:collection:${tx.id}`,
      date: tx.collection_date,
      amount: tx.amount,
      type: "in" as CashFlowType,
      category: "client_collection" as CashFlowCategory,
      project_code: tx.project_code || null,
      project_name: tx.project_name || undefined,
      description: tx.notes || "Client collection",
      reference: tx.reference_no || tx.invoice_number || undefined,
      created_at: tx.created_at,
    }));

    const cashEntries = snapshot.cashFlowTransactions.map((tx) => ({
      id: `ledger:cash:${tx.id}`,
      date: tx.transaction_date,
      amount: tx.amount,
      type: tx.type as CashFlowType,
      category: ((tx.category || "other") in CATEGORY_META ? tx.category : "other") as CashFlowCategory,
      project_code: tx.project_code,
      project_name: tx.project_name || undefined,
      description: tx.description || undefined,
      reference: tx.reference_no || undefined,
      created_at: tx.created_at,
    }));

    return [...collectionEntries, ...cashEntries];
  }, [snapshot.collections, snapshot.cashFlowTransactions]);

  const kpis = useMemo(() => {
    const totalIn = allEntries.filter((e) => e.type === "in").reduce((sum, e) => sum + e.amount, 0);
    const totalOut = allEntries.filter((e) => e.type === "out").reduce((sum, e) => sum + e.amount, 0);
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      inCount: allEntries.filter((e) => e.type === "in").length,
      outCount: allEntries.filter((e) => e.type === "out").length,
    };
  }, [allEntries]);

  const monthlyTrend = snapshot.monthly.map((m) => ({
    month: m.month,
    cashIn: m.actualCollected,
    cashOut: m.actualCashOut,
    cumulative: m.cumulativeActual,
  }));

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<CashFlowCategory, number>();
    snapshot.cashFlowTransactions.forEach((tx) => {
      if (tx.type !== "out") return;
      const category = ((tx.category || "other") in CATEGORY_META ? tx.category : "other") as CashFlowCategory;
      totals.set(category, (totals.get(category) || 0) + tx.amount);
    });
    return Array.from(totals.entries()).map(([category, amount]) => ({
      category,
      amount,
      ...CATEGORY_META[category],
    }));
  }, [snapshot.cashFlowTransactions]);

  // Financial analytics (for IPC-level data)
  const { portfolio, projects: projectFinancials } = useFinancialAnalytics();
  const { data: invoices = [] } = useInvoices();
  const { data: projects = [] } = useIPCProjects();

  // ── Filter entries ────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let list = allEntries;
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (filterProject) list = list.filter((e) => e.project_code === filterProject);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.description || "").toLowerCase().includes(q) ||
        (e.project_name || "").toLowerCase().includes(q) ||
        (e.project_code || "").toLowerCase().includes(q) ||
        (e.reference || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, filterType, filterProject, search]);

  // ── Sync collections from IPC ─────────────────────────────────
  const handleImportCollections = () => {
    importCollections(invoices);
    toast.success("تم مزامنة التحصيلات من سجل المستخلصات");
  };

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredEntries.map((e) => ({
      "التاريخ": e.date,
      "المبلغ": e.amount,
      "النوع": e.type === "in" ? "وارد" : "صادر",
      "الفئة": CATEGORY_META[e.category]?.labelAr || e.category,
      "المشروع": e.project_name || e.project_code || "-",
      "الوصف": e.description || "",
      "المرجع": e.reference || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التدفقات النقدية");
    XLSX.writeFile(wb, `CashFlow_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير البيانات");
  };

  // ── Prepare monthly chart data ────────────────────────────────
  const chartData = useMemo(() => {
    return monthlyTrend.map((m) => {
      return {
        month: m.month,
        cashIn: Math.round(m.cashIn / 1000),
        cashOut: Math.round(m.cashOut / 1000),
        net: Math.round(m.cumulative / 1000),
      };
    });
  }, [monthlyTrend]);

  // ── Category donut data ───────────────────────────────────────
  const categoryData = useMemo(() => {
    return categoryBreakdown
      .filter((c) => c.amount > 0)
      .map((c) => ({
        name: c.labelAr || c.label,
        value: c.amount,
        color: c.color,
      }));
  }, [categoryBreakdown]);

  const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899"];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Wallet className="text-primary" size={28} />
            التدفقات النقدية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة ومتابعة الواردات والصادرات النقدية للمشاريع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImportCollections} className="gap-1.5 text-xs">
            <TrendingUp size={13} /> مزامنة التحصيلات
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs" disabled={filteredEntries.length === 0}>
            <Download size={13} /> تصدير
          </Button>
          <AddEntryDialog />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiMini
          label="إجمالي الوارد"
          value={`${fmtCompact(kpis.totalIn)} ج.م`}
          sub={`${kpis.inCount} قيد`}
          icon={TrendingUp}
          color="hsl(142, 71%, 45%)"
        />
        <KpiMini
          label="إجمالي الصادر"
          value={`${fmtCompact(kpis.totalOut)} ج.م`}
          sub={`${kpis.outCount} قيد`}
          icon={TrendingDown}
          color="hsl(0, 72%, 50%)"
        />
        <KpiMini
          label="صافي النقد"
          value={`${fmtCompact(kpis.net)} ج.م`}
          sub={kpis.net >= 0 ? "موجب" : "سالب"}
          icon={DollarSign}
          color={kpis.net >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 50%)"}
        />
        <KpiMini
          label="تحصيلات IPC"
          value={`${fmtCompact(portfolio.total_collections)} ج.م`}
          sub={`من ${portfolio.project_count} مشروع`}
          icon={Wallet}
          color="hsl(217, 91%, 60%)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend — Stacked Bar + Cumulative Line */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Calendar size={15} className="text-primary" />
            الاتجاه الشهري (ألف ج.م)
          </h3>
          {chartData.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    formatter={(v: number, name: string) => {
                      const labels: Record<string, string> = { cashIn: "وارد", cashOut: "صادر", net: "صافي تراكمي" };
                      return [`${v} ألف`, labels[name] || name];
                    }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = { cashIn: "وارد", cashOut: "صادر", net: "صافي تراكمي" };
                      return labels[value] || value;
                    }}
                  />
                  <Bar dataKey="cashIn" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} stackId="a" name="cashIn" />
                  <Bar dataKey="cashOut" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} stackId="b" name="cashOut" />
                  <Line type="monotone" dataKey="net" stroke="hsl(45, 93%, 47%)" strokeWidth={2} dot={{ fill: "hsl(45, 93%, 47%)", r: 3 }} name="net" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
              لا توجد قيود بعد — أضف قيوداً أو استخدم "مزامنة التحصيلات"
            </div>
          )}
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Wallet size={15} className="text-primary" />
            التوزيع حسب الفئة
          </h3>
          {categoryData.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {categoryData.map((c, i) => (
                        <Cell key={i} fill={c.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${fmt(v)} ج.م`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {categoryData.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
              لا توجد بيانات
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 text-sm" />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="in">وارد</SelectItem>
            <SelectItem value="out">صادر</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProject || ALL_PROJECTS_VALUE} onValueChange={(v) => setFilterProject(v === ALL_PROJECTS_VALUE ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="كل المشاريع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS_VALUE}>كل المشاريع</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.project_code} value={p.project_code}>{p.project_code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filteredEntries.length} قيد</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground">النوع</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">الفئة</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المشروع</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المبلغ (ج.م)</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">الوصف</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المرجع</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Wallet className="mx-auto mb-2 text-muted-foreground/40" size={32} />
                    <p className="text-sm">لا توجد قيود تدفق نقدي</p>
                    <p className="text-xs mt-1">أضف قيود جديدة أو استخدم مزامنة التحصيلات</p>
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => {
                const catMeta = CATEGORY_META[entry.category];
                return (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 group">
                    <td className="py-2.5 px-3 text-xs font-mono">
                      {new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        entry.type === "in"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}>
                        {entry.type === "in" ? "وارد" : "صادر"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${catMeta?.color || "#666"}15`, color: catMeta?.color || "#666" }}>
                        {catMeta?.labelAr || entry.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground truncate max-w-[150px]" title={entry.project_name || ""}>
                      {entry.project_code || "-"}
                    </td>
                    <td className={`py-2.5 px-3 text-xs font-mono font-semibold text-right ${
                      entry.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {entry.type === "in" ? "+" : "-"}{fmt(entry.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground truncate max-w-[200px]" title={entry.description || ""}>
                      {entry.description || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">{entry.reference || "-"}</td>
                    <td className="py-2.5 px-3 text-center">
                      {!entry.id.startsWith("ledger:") && (
                      <button
                        onClick={() => { deleteEntry(entry.id); toast.success("تم الحذف"); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Project Cash Summary */}
      {projectFinancials.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">ملخص النقد حسب المشروع</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">المشروع</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">قيمة العقد</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">صافي معتمد</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">تحصيلات</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">متبقي</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground">كفاءة التحصيل</th>
                </tr>
              </thead>
              <tbody>
                {projectFinancials.slice(0, 10).map((p) => (
                  <tr key={p.project_code} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2.5 px-3">
                      <div className="text-xs font-medium">{p.project_code}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.project_name}</div>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-right">{fmt(p.contract_value)}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-right">{fmt(p.approved_net)}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-right text-green-600 dark:text-green-400 font-semibold">
                      {p.total_collections > 0 ? fmt(p.total_collections) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-right text-red-600 dark:text-red-400">
                      {p.outstanding > 0 ? fmt(p.outstanding) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${
                          p.collection_efficiency >= 0.8 ? "text-green-600 dark:text-green-400" :
                          p.collection_efficiency >= 0.5 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-red-600 dark:text-red-400"
                        }`}>
                          {(p.collection_efficiency * 100).toFixed(0)}%
                        </span>
                        <div className="w-14 bg-muted rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.collection_efficiency >= 0.8 ? "bg-green-500" :
                              p.collection_efficiency >= 0.5 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(p.collection_efficiency * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
