import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  FolderKanban,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Wallet,
  Receipt,
  BarChart3,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompact = (amount: number) => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
};

const statusColors: Record<string, string> = {
  "On Track": "bg-primary text-primary-foreground",
  "يعمل": "bg-primary text-primary-foreground",
  "At Risk": "bg-brand-orange text-accent-foreground",
  "متأخر": "bg-destructive text-destructive-foreground",
  "Delayed": "bg-destructive text-destructive-foreground",
  "Completed": "bg-brand-blue text-white",
  "مكتمل": "bg-brand-blue text-white",
  "متوقف": "bg-brand-orange text-accent-foreground",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ─── KPI Card Sub-component ─────────────────────────────── */
function KPICard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {sub && (
        <div className="flex items-center gap-1 mt-3">
          <ArrowUpRight size={14} style={{ color }} />
          <span className="text-xs font-medium" style={{ color }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: d, isLoading } = useDashboard();

  if (isLoading || !d) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">جاري تحميل لوحة القيادة...</p>
      </div>
    );
  }

  const collectionPct = (d.collectionRate * 100).toFixed(1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page title */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-heading font-bold text-foreground">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of all construction operations — لوحة القيادة التنفيذية
        </p>
      </motion.div>

      {/* KPI Cards — Row 1: Project Overview */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="إجمالي المشاريع"
          value={d.totalProjects}
          sub={`${d.activeProjects} نشط`}
          icon={FolderKanban}
          color="hsl(178, 55%, 35%)"
        />
        <KPICard
          title="قيمة التعاقدات"
          value={formatCurrency(d.totalContractValue)}
          sub={`${d.totalProjects} مشروع`}
          icon={DollarSign}
          color="hsl(217, 91%, 60%)"
        />
        <KPICard
          title="الدفعات المقدمة"
          value={formatCurrency(d.totalAdvancedPayment)}
          icon={Receipt}
          color="hsl(280, 65%, 60%)"
        />
        <KPICard
          title="متأخرة / متوقفة"
          value={d.delayedProjects + d.atRiskProjects}
          sub="تنبيه"
          icon={AlertTriangle}
          color="hsl(25, 90%, 55%)"
        />
      </motion.div>

      {/* KPI Cards — Row 2: Financial Performance */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="صافي المعتمد"
          value={`EGP ${formatCompact(d.totalApprovedNet)}`}
          sub={`من ${formatCompact(d.totalSubmitted)} مقدم`}
          icon={Target}
          color="hsl(142, 71%, 45%)"
        />
        <KPICard
          title="إجمالي التحصيلات"
          value={`EGP ${formatCompact(d.totalCollections)}`}
          sub={`${collectionPct}% كفاءة`}
          icon={Wallet}
          color="hsl(142, 71%, 45%)"
        />
        <KPICard
          title="المستحقات المتبقية"
          value={`EGP ${formatCompact(d.totalOutstanding)}`}
          sub="غير محصلة"
          icon={TrendingUp}
          color="hsl(0, 72%, 50%)"
        />
        <KPICard
          title="نسبة التحصيل"
          value={`${collectionPct}%`}
          sub={d.collectionRate >= 0.7 ? "جيد" : d.collectionRate >= 0.5 ? "متوسط" : "ضعيف"}
          icon={BarChart3}
          color={d.collectionRate >= 0.7 ? "hsl(142, 71%, 45%)" : d.collectionRate >= 0.5 ? "hsl(45, 93%, 47%)" : "hsl(0, 72%, 50%)"}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Submitted vs Approved vs Collected Monthly Trend */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow-card border border-border">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">
            المقدم مقابل المعتمد مقابل المحصّل (مليون جنيه)
          </h3>
          {d.revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={d.revenueData}>
                <defs>
                  <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      submitted: "المقدم",
                      approved: "المعتمد",
                      collected: "المحصّل",
                    };
                    return [`${value} مليون`, labels[name] || name];
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      submitted: "المقدم",
                      approved: "المعتمد",
                      collected: "المحصّل",
                    };
                    return labels[value] || value;
                  }}
                />
                <Area type="monotone" dataKey="submitted" stroke="hsl(217, 91%, 60%)" fill="url(#submittedGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" stroke="hsl(45, 93%, 47%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="collected" stroke="hsl(142, 71%, 45%)" fill="url(#collectedGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              لا توجد بيانات مستخلصات بعد — أضف مستخلصات لرؤية الرسم البياني
            </div>
          )}
        </div>

        {/* Project Status Pie */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border flex flex-col">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">حالة المشاريع (Project Status)</h3>
          {d.statusData && d.statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={d.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {d.statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
                {d.statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Projects Table */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow-card border border-border">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Active Projects</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">PM</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {d.recentProjects.map((proj, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">{proj.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{proj.pm}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${proj.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{proj.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[proj.status] || "bg-muted text-muted-foreground"}`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-foreground">
                      {formatCurrency(proj.value)}
                    </td>
                  </tr>
                ))}
                {d.recentProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">لا توجد مشاريع جارية</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Flow — Real Data */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Cash Flow (EGP M)</h3>
          {d.cashFlowData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { cashIn: "وارد", cashOut: "صادر" };
                      return [`${value} مليون`, labels[name] || name];
                    }}
                  />
                  <Bar dataKey="cashIn" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="cashIn" />
                  <Bar dataKey="cashOut" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} name="cashOut" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                  <span className="text-muted-foreground">Cash In (محصّل)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} />
                  <span className="text-muted-foreground">Cash Out (متبقي)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              لا توجد بيانات تدفقات نقدية
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
