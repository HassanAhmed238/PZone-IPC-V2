import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, DollarSign, CheckCircle2, Banknote, AlertTriangle,
  Plus, Edit2, BarChart2, Clock,
} from "lucide-react";
import { fmtNum, fmtCompact } from "@/lib/utils";
import { useInvoices, type Invoice } from "@/hooks/useIPC";
import { IPCFormModal } from "@/components/ipc/IPCFormModal";

const fmtMoney = fmtCompact;
const fmtFull = (v: number) => fmtNum(v);

/* ─── Status badge ─────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "تحت الاعتماد": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "معتمد": { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  "جارى المراجعه للتقديم": { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  "ختامى": { color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: "#64748b", bg: "rgba(100,116,139,0.1)" };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}33` }}>
      {status}
    </span>
  );
}

/* ─── Main Tab ─────────────────────────────────────────── */
interface Props {
  projectCode: string;
  projectName: string;
}

export default function ProjectIPCsTab({ projectCode, projectName }: Props) {
  const { data: allInvoices = [], isLoading } = useInvoices();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Filter invoices by project
  const invoices = useMemo(
    () => allInvoices.filter((inv) => inv.project_code === projectCode),
    [allInvoices, projectCode]
  );

  // KPIs
  const totalSubmitted = invoices.reduce((s, inv) => s + (inv.net_total || 0), 0);
  const totalApproved = invoices.reduce((s, inv) => s + (inv.approved_net_total || 0), 0);
  const totalCollected = invoices.reduce((s, inv) => s + (inv.total_collections || 0), 0);
  const outstanding = totalApproved - totalCollected;

  const handleNew = () => {
    setEditingInvoice(null);
    setShowFormModal(true);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setShowFormModal(true);
  };

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading IPCs...</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "IPCs Count / عدد المستخلصات", value: String(invoices.length), color: "#a855f7", icon: FileText },
          { label: "Net Submitted / صافي المقدم", value: fmtMoney(totalSubmitted), color: "#3b82f6", icon: DollarSign },
          { label: "Net Approved / صافي المعتمد", value: fmtMoney(totalApproved), color: "#22c55e", icon: CheckCircle2 },
          { label: "Outstanding / المتبقي", value: fmtMoney(outstanding), color: outstanding > 0 ? "#ef4444" : "#22c55e", icon: outstanding > 0 ? AlertTriangle : Banknote },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/[0.06] p-4"
              style={{ background: `${kpi.color}08` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">{kpi.label}</span>
                <Icon size={14} style={{ color: kpi.color }} />
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Collection Progress */}
      {totalApproved > 0 && (
        <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: "rgba(245,158,11,0.04)" }}>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400 font-bold">Collection Progress / نسبة التحصيل</span>
            <span className="text-white font-bold font-mono">
              {((totalCollected / totalApproved) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalCollected / totalApproved) * 100, 100)}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full"
              style={{
                background: (totalCollected / totalApproved) > 0.75
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Collected: {fmtFull(totalCollected)}</span>
            <span>Remaining: {fmtFull(outstanding)}</span>
          </div>
        </div>
      )}

      {/* IPC Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
            <BarChart2 size={13} className="text-blue-400" />
            IPC Register / سجل المستخلصات
          </h4>
          <button onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <Plus size={12} />New IPC
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-14">
            <FileText size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-400 font-semibold">No IPCs for this project</p>
            <p className="text-slate-600 text-sm mt-1">Click "New IPC" to create the first payment certificate</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] text-slate-500 uppercase">
                  <th className="px-5 py-3 font-bold">IPC #</th>
                  <th className="px-3 py-3 font-bold">Date</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold text-right">Net Submitted</th>
                  <th className="px-3 py-3 font-bold text-right">Net Approved</th>
                  <th className="px-3 py-3 font-bold text-right">Collected</th>
                  <th className="px-3 py-3 font-bold text-right">Outstanding</th>
                  <th className="px-3 py-3 font-bold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.sort((a, b) => {
                  const na = parseInt(a.invoice_number || "0");
                  const nb = parseInt(b.invoice_number || "0");
                  return na - nb;
                }).map((inv, i) => {
                  const invOutstanding = (inv.approved_net_total || 0) - (inv.total_collections || 0);
                  return (
                    <motion.tr key={inv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono font-bold text-white">#{inv.invoice_number}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">{inv.submitted_date || "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-3 py-3 text-xs font-mono text-blue-300 text-right">{fmtFull(inv.net_total || 0)}</td>
                      <td className="px-3 py-3 text-xs font-mono text-green-300 text-right">{fmtFull(inv.approved_net_total || 0)}</td>
                      <td className="px-3 py-3 text-xs font-mono text-amber-300 text-right">{fmtFull(inv.total_collections || 0)}</td>
                      <td className="px-3 py-3 text-xs font-mono text-right"
                        style={{ color: invOutstanding > 0 ? "#f87171" : "#4ade80" }}>
                        {fmtFull(invOutstanding)}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => handleEdit(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr className="border-t border-white/10 text-xs font-bold">
                  <td className="px-5 py-3 text-slate-400" colSpan={3}>TOTAL</td>
                  <td className="px-3 py-3 font-mono text-blue-400 text-right">{fmtFull(totalSubmitted)}</td>
                  <td className="px-3 py-3 font-mono text-green-400 text-right">{fmtFull(totalApproved)}</td>
                  <td className="px-3 py-3 font-mono text-amber-400 text-right">{fmtFull(totalCollected)}</td>
                  <td className="px-3 py-3 font-mono text-right" style={{ color: outstanding > 0 ? "#f87171" : "#4ade80" }}>
                    {fmtFull(outstanding)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* IPC Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <IPCFormModal
            invoice={editingInvoice}
            onClose={() => { setShowFormModal(false); setEditingInvoice(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
