import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Check, Clock, Eye, TrendingUp, Wallet, Percent } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { fmtNum, fmtCompact, fmtPercent } from "@/lib/utils";
import { useProjectHistory, useGapAnalysis, type Invoice } from "@/hooks/useIPC";

const fmtMoney = fmtCompact;
const fmtFull = (v: number) => fmtNum(v);
const fmtPct = fmtPercent;

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "معتمد": { color: "#22c55e", bg: "#22c55e18", label: "Approved" },
  "تحت الاعتماد": { color: "#f59e0b", bg: "#f59e0b18", label: "Pending" },
  "جارى المراجعه للتقديم": { color: "#3b82f6", bg: "#3b82f618", label: "Under Review" },
  "ختامى": { color: "#a855f7", bg: "#a855f718", label: "Final" },
};

const COLORS = ["#667eea", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 p-3 text-xs"
      style={{ background: "#0f172a", backdropFilter: "blur(12px)", minWidth: 160 }}>
      {label && <div className="text-slate-400 font-bold mb-2">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono font-bold">{typeof p.value === "number" ? fmtFull(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

interface Props {
  projectCode: string | null;
  invoices: Invoice[];
  onClose: () => void;
}

export function IPCProjectDrilldown({ projectCode, invoices, onClose }: Props) {
  const { data: history = [], isLoading } = useProjectHistory(projectCode);
  const { data: gapData = [] } = useGapAnalysis();

  /* ── Project info ── */
  const projectInfo = useMemo(() => {
    const inv = invoices.find((i) => i.project_code === projectCode);
    return inv ? {
      name: inv.project_name,
      client: inv.client || "Unknown",
      sector: inv.sector || "—",
      contract_value: inv.contract_value,
    } : null;
  }, [invoices, projectCode]);

  /* ── Gap data for this project ── */
  const projectGap = gapData.find((g) => g.project_code === projectCode);

  /* ── Cumulative timeline chart ── */
  const timelineData = useMemo(() => {
    let cumSubmitted = 0;
    let cumApproved = 0;
    let cumCollected = 0;
    return history.map((h) => {
      cumSubmitted += h.submitted;
      cumApproved += h.approved;
      cumCollected += h.collected;
      return {
        name: `IPC #${h.invoice_number}`,
        Submitted: cumSubmitted,
        Approved: cumApproved,
        Collected: cumCollected,
      };
    });
  }, [history]);

  /* ── Deduction breakdown aggregate ── */
  const deductionPie = useMemo(() => {
    const map = new Map<string, number>();
    invoices
      .filter((inv) => inv.project_code === projectCode)
      .forEach((inv) => {
        (inv.deductions_breakdown || []).forEach((d) => {
          const key = d.name || "Other";
          map.set(key, (map.get(key) || 0) + d.amount);
        });
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [invoices, projectCode]);

  /* ── Latest invoice stats ── */
  const latest = history[history.length - 1];

  return (
    <AnimatePresence>
      {projectCode && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl overflow-y-auto"
            style={{ background: "linear-gradient(135deg, #0a1628 0%, #111827 100%)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
              style={{ background: "rgba(10, 22, 40, 0.95)", backdropFilter: "blur(12px)" }}>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #667eea33, #764ba233)" }}>
                    <Building2 size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{projectCode}</h2>
                    <p className="text-[11px] text-slate-400">{projectInfo?.name}</p>
                  </div>
                </div>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Meta */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Client", value: projectInfo?.client || "—", color: "#667eea" },
                  { label: "Sector", value: projectInfo?.sector || "—", color: "#a855f7" },
                  { label: "Contract Value", value: fmtMoney(projectInfo?.contract_value || 0), color: "#22c55e" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3 border border-white/[0.06]"
                    style={{ background: `${item.color}08` }}>
                    <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                    <div className="text-sm font-black" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Summary KPIs */}
              {projectGap && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 space-y-1">
                    <div className="text-[10px] text-slate-400">Total Submitted / المقدم</div>
                    <div className="text-xl font-black text-blue-300 font-mono">{fmtMoney(projectGap.submitted)}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-green-500/20 bg-green-500/5 space-y-1">
                    <div className="text-[10px] text-slate-400">Total Approved / المعتمد</div>
                    <div className="text-xl font-black text-green-300 font-mono">{fmtMoney(projectGap.approved)}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-1">
                    <div className="text-[10px] text-slate-400">Collected / المحصل</div>
                    <div className="text-xl font-black text-amber-300 font-mono">{fmtMoney(projectGap.collected)}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/5 space-y-1">
                    <div className="text-[10px] text-slate-400">Approval Gap / فجوة الاعتماد</div>
                    <div className="text-xl font-black font-mono"
                      style={{ color: projectGap.gapPct > 0.25 ? "#ef4444" : "#f59e0b" }}>
                      {fmtPct(projectGap.gapPct)}
                    </div>
                  </div>
                </div>
              )}

              {/* Cumulative Timeline Chart */}
              {timelineData.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] p-4"
                  style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-purple-400" />
                    Cumulative IPC Curve — منحنى المستخلصات
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timelineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Submitted" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} />
                      <Area type="monotone" dataKey="Approved" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                      <Area type="monotone" dataKey="Collected" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* IPC Timeline — vertical list */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet size={14} className="text-purple-400" />
                  IPC History — سجل المستخلصات
                  <span className="text-[10px] text-slate-500 font-normal ml-1">({history.length} IPCs)</span>
                </h3>
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No IPC history found</div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-4 bottom-4 w-px bg-gradient-to-b from-purple-500/50 to-transparent" />
                    <div className="space-y-3">
                      {history.map((h, i) => {
                        const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG["تحت الاعتماد"];
                        const isApproved = h.status === "معتمد";
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="ml-12 relative"
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-7 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: cfg.color, background: cfg.bg }}>
                              {isApproved
                                ? <Check size={8} style={{ color: cfg.color }} />
                                : <Clock size={8} style={{ color: cfg.color }} />}
                            </div>

                            <div className="rounded-xl border border-white/[0.05] p-4 hover:border-white/10 transition-all"
                              style={{ background: "rgba(255,255,255,0.02)" }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-white">IPC #{h.invoice_number}</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                    style={{ color: cfg.color, background: cfg.bg }}>
                                    {cfg.label}
                                  </span>
                                </div>
                                {h.submitted_date && (
                                  <span className="text-[10px] text-slate-500">{h.submitted_date}</span>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "Submitted", value: h.submitted, color: "#3b82f6" },
                                  { label: "Approved", value: h.approved, color: "#22c55e" },
                                  { label: "Collected", value: h.collected, color: "#f59e0b" },
                                ].map((item) => (
                                  <div key={item.label} className="text-center">
                                    <div className="text-[10px] text-slate-500">{item.label}</div>
                                    <div className="text-[11px] font-black font-mono" style={{ color: item.color }}>
                                      {fmtMoney(item.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {h.deductions > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] flex justify-between">
                                  <span className="text-slate-500">Deductions</span>
                                  <span className="text-red-400 font-mono">-{fmtMoney(h.deductions)}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Deduction Pie */}
              {deductionPie.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] p-4"
                  style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Percent size={14} className="text-purple-400" />
                    Deduction Breakdown — تفصيل الاستقطاعات
                  </h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={deductionPie} dataKey="value" cx="50%" cy="50%"
                          outerRadius={65} innerRadius={35} paddingAngle={3}>
                          {deductionPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {deductionPie.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-400 truncate max-w-[120px]">{d.name}</span>
                          </div>
                          <span className="text-white font-mono font-bold">{fmtMoney(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
