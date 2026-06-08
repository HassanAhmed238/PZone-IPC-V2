import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Plus, Trash2, Edit3, Phone, Mail, Building2,
  Briefcase, Filter, X, ChevronDown, Check, User, Globe,
  HardHat, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useStakeholders,
  useCreateStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  useStakeholderDepartments,
} from "@/hooks/useStakeholders";
import type { Stakeholder, StakeholderType } from "@/data/stakeholderSeedData";

const TYPE_CONFIG: Record<StakeholderType, { label: string; labelAr: string; icon: any; color: string }> = {
  employee:      { label: "Employee",      labelAr: "موظف",       icon: User,     color: "#667eea" },
  external:      { label: "External",      labelAr: "خارجي",      icon: Globe,    color: "#22c55e" },
  subcontractor: { label: "Subcontractor", labelAr: "مقاول باطن", icon: HardHat,  color: "#f59e0b" },
  vendor:        { label: "Vendor",        labelAr: "مورد",       icon: Package,  color: "#ef4444" },
};

const EMPTY_FORM: Omit<Stakeholder, "id"> = {
  name: "", job_title: "", code: "", phone: "", email: "",
  department: "", company: "P.zone", type: "employee",
};

export default function StakeholdersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StakeholderType | "all">("all");
  const [deptFilter, setDeptFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Stakeholder, "id">>(EMPTY_FORM);

  const { data: allStakeholders = [], isLoading } = useStakeholders();
  const { data: departments = [] } = useStakeholderDepartments();
  const createMut = useCreateStakeholder();
  const updateMut = useUpdateStakeholder();
  const deleteMut = useDeleteStakeholder();

  /* Filtered */
  const filtered = useMemo(() => {
    let result = allStakeholders;
    if (typeFilter !== "all") result = result.filter((s) => s.type === typeFilter);
    if (deptFilter) result = result.filter((s) => s.department === deptFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.job_title.toLowerCase().includes(q) ||
          s.code.includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allStakeholders, typeFilter, deptFilter, search]);

  /* Stats */
  const stats = useMemo(() => {
    const byType = { employee: 0, external: 0, subcontractor: 0, vendor: 0 };
    allStakeholders.forEach((s) => { byType[s.type] = (byType[s.type] || 0) + 1; });
    return byType;
  }, [allStakeholders]);

  /* Form handlers */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: Stakeholder) => {
    setEditingId(s.id);
    const { id, ...rest } = s;
    setForm(rest);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form });
    } else {
      createMut.mutate(form);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("حذف هذا السجل؟")) deleteMut.mutate(id);
  };

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users size={24} className="text-purple-400" />
            Stakeholder Directory
            <span className="text-base font-normal text-muted-foreground">/ دليل جهات الاتصال</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allStakeholders.length} contacts across employees, external, subcontractors & vendors
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> إضافة جهة اتصال
        </Button>
      </div>

      {/* ═══ Type Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(TYPE_CONFIG) as StakeholderType[]).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const isActive = typeFilter === type;
          return (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTypeFilter(isActive ? "all" : type)}
              className="rounded-xl border p-4 text-left transition-all"
              style={{
                borderColor: isActive ? `${cfg.color}66` : "rgba(255,255,255,0.06)",
                background: isActive
                  ? `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}08)`
                  : "linear-gradient(135deg, #0f172a, #1a2540)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${cfg.color}20` }}>
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>
                <span className="text-2xl font-black text-white">{stats[type]}</span>
              </div>
              <div className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
              <div className="text-[10px] text-slate-500">{cfg.labelAr}</div>
            </motion.button>
          );
        })}
      </div>

      {/* ═══ Filters ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, title, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={deptFilter || "all"} onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || typeFilter !== "all" || deptFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setDeptFilter(""); }}
            className="text-red-400 gap-1">
            <X size={12} /> Reset
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {allStakeholders.length} shown
        </span>
      </div>

      {/* ═══ Add/Edit Form ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-purple-500/20 p-5 space-y-4"
              style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b33)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {editingId ? "تعديل البيانات" : "إضافة جهة اتصال جديدة"}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X size={14} />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">الاسم *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Full name" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">المسمى الوظيفي</Label>
                  <Input value={form.job_title} onChange={(e) => updateField("job_title", e.target.value)}
                    placeholder="Job title" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الكود</Label>
                  <Input value={form.code} onChange={(e) => updateField("code", e.target.value)}
                    placeholder="Employee code" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">النوع</Label>
                  <Select value={form.type} onValueChange={(v) => updateField("type", v as StakeholderType)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_CONFIG) as StakeholderType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label} — {TYPE_CONFIG[t].labelAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الهاتف</Label>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Phone" className="h-8" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">البريد الإلكتروني</Label>
                  <Input value={form.email} onChange={(e) => updateField("email", e.target.value)}
                    placeholder="Email" className="h-8" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">القسم</Label>
                  <Input value={form.department} onChange={(e) => updateField("department", e.target.value)}
                    placeholder="Department" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الشركة</Label>
                  <Input value={form.company} onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Company" className="h-8" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleSave} disabled={!form.name.trim()} className="gap-1">
                  <Check size={14} /> {editingId ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Table ═══ */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0b1120, #131d35)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase">Name / الاسم</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase">Title / المسمى</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase hidden md:table-cell">Code</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase hidden lg:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase hidden md:table-cell">Dept / Company</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase">Type</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const cfg = TYPE_CONFIG[s.type];
                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `${cfg.color}15`, color: cfg.color }}>
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-white truncate max-w-[200px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[180px] truncate">{s.job_title || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 font-mono hidden md:table-cell">{s.code || "—"}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <Phone size={10} /> {s.phone}
                        </a>
                      ) : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {s.email ? (
                        <a href={`mailto:${s.email}`} className="text-xs text-purple-400 hover:underline flex items-center gap-1 truncate max-w-[200px]">
                          <Mail size={10} /> {s.email}
                        </a>
                      ) : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 hidden md:table-cell">
                      {s.department || s.company || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-blue-400 transition-colors">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No stakeholders found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
