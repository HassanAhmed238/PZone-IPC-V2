import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, Building2, Users, Calendar, MapPin,
  FileText, TrendingUp, DollarSign, ChevronDown, ChevronUp,
  Check, Clock, Search, Filter, X,
} from "lucide-react";
import { fmtNum, fmtCompact } from "@/lib/utils";
import {
  useIPCProjects, useCreateIPCProject, useUpdateIPCProject, useDeleteIPCProject,
  totalAuthorized,
  type IPCProject, type IPCProjectInput, type VOItem,
} from "@/hooks/useIPCProjects";

const fmtMoney = fmtCompact;
const fmtFull = (v: number) => fmtNum(v);

const SECTOR_COLORS: Record<string, string> = {
  Housing: "#667eea", Infrastructure: "#22c55e", Commercial: "#f59e0b",
  Industrial: "#ef4444", Hospitality: "#a855f7", Education: "#06b6d4",
  Healthcare: "#ec4899", Government: "#14b8a6",
};

const emptyProject: IPCProjectInput = {
  project_code: "", project_name: "", client: null, sector: null,
  project_manager: null, contract_value: 0, start_date: null, end_date: null,
  location: null, description: null, variation_orders: [], is_active: true,
};

/* ─── VO Mini Manager ─────────────────────────────────── */
function VOManager({ vos, onChange }: { vos: VOItem[]; onChange: (vos: VOItem[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Variation Orders / أوامر التغيير</span>
        <button type="button"
          onClick={() => onChange([...vos, { vo_number: "", description: "", amount: 0, status: "pending" }])}
          className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
          <Plus size={10} />Add VO
        </button>
      </div>
      {vos.length === 0 && (
        <p className="text-[11px] text-slate-600 italic">No VOs — add variation orders above</p>
      )}
      {vos.map((vo, i) => (
        <div key={i} className="grid grid-cols-[80px_1fr_130px_100px_24px] gap-1.5 items-center">
          <input value={vo.vo_number} placeholder="VO-001"
            onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], vo_number: e.target.value }; onChange(a); }}
            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none" />
          <input value={vo.description} placeholder="Description / وصف"
            onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], description: e.target.value }; onChange(a); }}
            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none" />
          <input type="number" value={vo.amount} placeholder="Amount"
            onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], amount: parseFloat(e.target.value) || 0 }; onChange(a); }}
            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none" />
          <select value={vo.status}
            onChange={(e) => { const a = [...vos]; a[i] = { ...a[i], status: e.target.value as "pending" | "approved" }; onChange(a); }}
            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <button type="button" onClick={() => onChange(vos.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-300 flex items-center justify-center"><X size={12} /></button>
        </div>
      ))}
      {vos.length > 0 && (
        <div className="flex justify-between text-[10px] pt-1 border-t border-white/5">
          <span className="text-slate-500">Approved VOs Total</span>
          <span className="text-green-300 font-mono font-bold">
            {fmtFull(vos.filter((v) => v.status === "approved").reduce((s, v) => s + v.amount, 0))}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Project Form Modal ──────────────────────────────── */
function ProjectModal({
  project, onClose,
}: {
  project: IPCProject | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<IPCProjectInput>(project ? { ...project } : { ...emptyProject });
  const create = useCreateIPCProject();
  const update = useUpdateIPCProject();

  const f = <K extends keyof IPCProjectInput>(key: K, value: IPCProjectInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.project_code.trim() || !form.project_name.trim()) {
      return;
    }
    if (project) {
      update.mutate({ id: project.id, ...form }, { onSuccess: onClose });
    } else {
      create.mutate(form, { onSuccess: onClose });
    }
  };

  const Input = ({ label, field, type = "text", mono = false, placeholder = "" }: {
    label: string; field: keyof IPCProjectInput; type?: string; mono?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>
      <input type={type} value={(form[field] as string) || ""}
        onChange={(e) => f(field, (type === "number" ? parseFloat(e.target.value) || 0 : e.target.value) as any)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none focus:border-purple-500/50 ${mono ? "font-mono" : ""}`} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 p-6"
        style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-white">
              {project ? "Edit Project / تعديل المشروع" : "New Project / مشروع جديد"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Add project to IPC master data</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Identity */}
          <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4">
            <h4 className="text-xs font-bold text-purple-400 mb-3 uppercase flex items-center gap-2">
              <Building2 size={12} />Project Identity / هوية المشروع
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Project Code / كود المشروع" field="project_code" placeholder="25-01" />
              <Input label="Invoice Name / اسم المشروع" field="project_name" placeholder="SOUL Infrastructure Phase 1" />
              <Input label="Client / Employer / العميل" field="client" placeholder="AAIB, Palm Hills..." />
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sector / القطاع</label>
                <select value={form.sector || ""}
                  onChange={(e) => f("sector", e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none">
                  <option value="">— Select —</option>
                  {["Housing", "Infrastructure", "Commercial", "Industrial", "Hospitality", "Education", "Healthcare", "Government"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Input label="Project Manager / مدير المشروع" field="project_manager" placeholder="Eng. Ahmed Hassan" />
              <Input label="Location / الموقع" field="location" placeholder="New Cairo, 6th October..." />
            </div>
          </div>

          {/* Financial */}
          <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4">
            <h4 className="text-xs font-bold text-green-400 mb-3 uppercase flex items-center gap-2">
              <DollarSign size={12} />Contract & Dates / العقد والمواعيد
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contract Value (EGP) / قيمة العقد" field="contract_value" type="number" mono placeholder="0" />
              <div /> {/* spacer */}
              <Input label="Start Date / تاريخ البدء" field="start_date" type="date" />
              <Input label="End Date / تاريخ الانتهاء" field="end_date" type="date" />
            </div>
          </div>

          {/* VOs */}
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4">
            <h4 className="text-xs font-bold text-blue-400 mb-3 uppercase flex items-center gap-2">
              <TrendingUp size={12} />Variation Orders / أوامر التغيير
            </h4>
            <VOManager
              vos={form.variation_orders}
              onChange={(vos) => f("variation_orders", vos)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notes / ملاحظات</label>
            <textarea value={form.description || ""} rows={2}
              onChange={(e) => f("description", e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none resize-none" />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Active Project:</label>
            <button type="button" onClick={() => f("is_active", !form.is_active)}
              className={`relative w-10 h-5 rounded-full transition-all ${form.is_active ? "bg-green-500" : "bg-slate-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_active ? "left-5.5" : "left-0.5"}`} />
            </button>
            <span className="text-xs font-bold" style={{ color: form.is_active ? "#22c55e" : "#64748b" }}>
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={create.isPending || update.isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            {create.isPending || update.isPending ? "Saving..." : project ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Projects Tab ───────────────────────────────── */
interface Props {
  isAdmin: boolean;
}

export function IPCProjectsTab({ isAdmin }: Props) {
  const { data: projects = [], isLoading } = useIPCProjects();
  const deleteProject = useDeleteIPCProject();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<IPCProject | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) =>
      p.project_code.toLowerCase().includes(q) ||
      p.project_name.toLowerCase().includes(q) ||
      (p.client || "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this project? Any linked IPCs will remain.")) return;
    deleteProject.mutate(id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, client..."
            className="pl-9 pr-4 py-2 rounded-xl bg-slate-800/60 border border-white/[0.05] text-sm text-white placeholder:text-slate-500 w-56 focus:outline-none focus:border-purple-500/40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{filtered.length} projects</span>
          {isAdmin && (
            <button onClick={() => { setEditingProject(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <Plus size={14} />New Project
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 font-semibold">No projects yet</p>
          {isAdmin && <p className="text-slate-600 text-sm mt-1">Click "New Project" to add your first project</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((proj, i) => {
            const isExpanded = expandedId === proj.id;
            const authorized = totalAuthorized(proj);
            const approvedVOs = proj.variation_orders.filter((v) => v.status === "approved");
            const pendingVOs = proj.variation_orders.filter((v) => v.status === "pending");
            const sectorColor = SECTOR_COLORS[proj.sector || ""] || "#667eea";

            return (
              <motion.div key={proj.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/[0.06] overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>

                {/* Color accent bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${sectorColor}, transparent)` }} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{ background: `${sectorColor}22`, color: sectorColor }}>
                        {proj.project_code.split("-")[0] || "P"}
                      </div>
                      <div>
                        <div className="font-black text-white text-sm">{proj.project_code}</div>
                        <div className="text-[11px] text-slate-400 max-w-[180px] truncate">{proj.project_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <button onClick={() => { setEditingProject(proj); setShowModal(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDelete(proj.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : proj.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Key info */}
                  <div className="space-y-1.5 text-[11px]">
                    {proj.client && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 size={10} />
                        <span className="truncate">{proj.client}</span>
                      </div>
                    )}
                    {proj.project_manager && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Users size={10} />
                        <span>{proj.project_manager}</span>
                      </div>
                    )}
                    {proj.location && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin size={10} />
                        <span>{proj.location}</span>
                      </div>
                    )}
                    {(proj.start_date || proj.end_date) && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={10} />
                        <span>{proj.start_date || "?"} → {proj.end_date || "?"}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial summary */}
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Contract Value</div>
                      <div className="text-sm font-black text-purple-300 font-mono">{fmtMoney(proj.contract_value)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Authorized (+VOs)</div>
                      <div className="text-sm font-black text-green-300 font-mono">{fmtMoney(authorized)}</div>
                    </div>
                  </div>

                  {/* VO badges */}
                  {proj.variation_orders.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {approvedVOs.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                          <Check size={8} />{approvedVOs.length} Approved VOs
                        </span>
                      )}
                      {pendingVOs.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock size={8} />{pendingVOs.length} Pending VOs
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded VO table */}
                  <AnimatePresence>
                    {isExpanded && proj.variation_orders.length > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Variation Orders Detail</div>
                          {proj.variation_orders.map((vo, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] rounded-lg px-2 py-1.5 bg-white/[0.02]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400">{vo.vo_number}</span>
                                <span className="text-slate-300 truncate max-w-[120px]">{vo.description}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-mono text-white">{fmtMoney(vo.amount)}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  vo.status === "approved" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                                }`}>{vo.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sector badge */}
                  {proj.sector && (
                    <div className="mt-3 flex justify-end">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${sectorColor}18`, color: sectorColor }}>
                        {proj.sector}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ProjectModal
            project={editingProject}
            onClose={() => { setShowModal(false); setEditingProject(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
