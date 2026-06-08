import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, Clock, TrendingUp, DollarSign, AlertCircle,
} from "lucide-react";
import { fmtNum, fmtCompact } from "@/lib/utils";
import {
  useIPCProjectByCode, useUpdateIPCProject, totalAuthorized,
  type VOItem,
} from "@/hooks/useIPCProjects";

const fmtMoney = fmtCompact;
const fmtFull = (v: number) => fmtNum(v);

/* ─── VO Manager (reused pattern) ──────────────────────── */
function VOEditor({ vos, onChange }: { vos: VOItem[]; onChange: (vos: VOItem[]) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
          <TrendingUp size={13} className="text-purple-400" />
          Variation Orders / أوامر التغيير
        </span>
        <button type="button"
          onClick={() => onChange([...vos, { vo_number: "", description: "", amount: 0, status: "pending" }])}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-500/10 transition-all">
          <Plus size={12} />Add VO
        </button>
      </div>
      {vos.length === 0 && (
        <div className="text-center py-10 rounded-xl border border-dashed border-white/10">
          <TrendingUp size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-sm text-slate-500 font-semibold">No Variation Orders</p>
          <p className="text-xs text-slate-600 mt-1">Click "Add VO" to create the first variation order</p>
        </div>
      )}
      {vos.map((vo, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/[0.06] p-4"
          style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="grid grid-cols-[100px_1fr_150px_110px_28px] gap-2 items-center">
            <input value={vo.vo_number} placeholder="VO-001"
              onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], vo_number: e.target.value }; onChange(a); }}
              className="px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none focus:border-purple-500/40" />
            <input value={vo.description} placeholder="Description / وصف"
              onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], description: e.target.value }; onChange(a); }}
              className="px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none focus:border-purple-500/40" />
            <input type="number" value={vo.amount} placeholder="Amount"
              onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], amount: parseFloat(e.target.value) || 0 }; onChange(a); }}
              className="px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none focus:border-purple-500/40" />
            <select value={vo.status}
              onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], status: e.target.value as "pending" | "approved" }; onChange(a); }}
              className="px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <button type="button" onClick={() => onChange(vos.filter((_, j) => j !== i))}
              className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Main Tab ─────────────────────────────────────────── */
interface Props {
  projectCode: string;
}

export default function ProjectVOsTab({ projectCode }: Props) {
  const { data: ipcProject, isLoading } = useIPCProjectByCode(projectCode);
  const updateProject = useUpdateIPCProject();
  const [localVOs, setLocalVOs] = useState<VOItem[] | null>(null);
  const [dirty, setDirty] = useState(false);

  // Use local state while editing, fall back to fetched data
  const vos = localVOs ?? ipcProject?.variation_orders ?? [];

  const handleChange = (newVOs: VOItem[]) => {
    setLocalVOs(newVOs);
    setDirty(true);
  };

  const handleSave = () => {
    if (!ipcProject || !localVOs) return;
    updateProject.mutate(
      { id: ipcProject.id, variation_orders: localVOs },
      {
        onSuccess: () => {
          setDirty(false);
          setLocalVOs(null); // reset to refetched data
        },
      }
    );
  };

  // Summary calculations
  const approvedVOs = vos.filter((v) => v.status === "approved");
  const pendingVOs = vos.filter((v) => v.status === "pending");
  const approvedTotal = approvedVOs.reduce((s, v) => s + v.amount, 0);
  const pendingTotal = pendingVOs.reduce((s, v) => s + v.amount, 0);
  const contractValue = ipcProject?.contract_value || 0;
  const authorized = contractValue + approvedTotal;

  if (isLoading) {
    return <div className="text-center py-16 text-slate-500">Loading VOs...</div>;
  }

  if (!ipcProject) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto text-slate-700 mb-3" />
        <p className="text-slate-400 font-semibold">Not synced to IPC yet</p>
        <p className="text-slate-600 text-sm mt-1">This project needs to be synced to the IPC module first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Contract Value / قيمة العقد", value: fmtMoney(contractValue), color: "#a855f7", icon: DollarSign },
          { label: "Approved VOs / أوامر معتمدة", value: `${approvedVOs.length} — ${fmtMoney(approvedTotal)}`, color: "#22c55e", icon: Check },
          { label: "Pending VOs / أوامر منتظرة", value: `${pendingVOs.length} — ${fmtMoney(pendingTotal)}`, color: "#f59e0b", icon: Clock },
          { label: "Total Authorized / المعتمد الكلي", value: fmtMoney(authorized), color: "#3b82f6", icon: TrendingUp },
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

      {/* VO Editor */}
      <div className="rounded-2xl border border-white/[0.06] p-6"
        style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
        <VOEditor vos={vos} onChange={handleChange} />

        {/* Summary bar */}
        {vos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-slate-500">
                Total VOs: <span className="text-white font-bold">{vos.length}</span>
              </span>
              <span className="text-slate-500">
                Approved: <span className="text-green-400 font-bold font-mono">{fmtFull(approvedTotal)}</span>
              </span>
              <span className="text-slate-500">
                Pending: <span className="text-amber-400 font-bold font-mono">{fmtFull(pendingTotal)}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      {dirty && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-end">
          <button onClick={handleSave} disabled={updateProject.isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", boxShadow: "0 4px 20px #667eea33" }}>
            {updateProject.isPending ? "Saving..." : "Save Variation Orders"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
