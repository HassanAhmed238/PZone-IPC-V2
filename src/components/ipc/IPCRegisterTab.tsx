import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Edit2, Trash2, Eye, Check, Clock,
  RefreshCw, Receipt, ArrowUp, ArrowDown, Search, Filter,
  X, Columns, CheckSquare, Square, RotateCcw,
  ChevronRight, AlertTriangle, TrendingUp,
} from "lucide-react";
import { fmtNum, fmtCompact, fmtPercent } from "@/lib/utils";
import { type Invoice, useUpdateInvoice, useDeletedInvoices, useRestoreInvoice, usePermanentlyDeleteFromTrash } from "@/hooks/useIPC";
import { useAuth } from "@/stores/useAuthStore";

/* Full numbers with commas for professional display: 6,659,440.00 */
const fmtMoney = (v: number) => fmtNum(v, 2);
const fmtFull = (v: number) => fmtNum(v);
const fmtPct = fmtPercent;

/* ─── Status Config ─────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; labelAr: string; labelEn: string; icon: React.ElementType }> = {
  "معتمد": { color: "#22c55e", bg: "#22c55e14", labelAr: "معتمد", labelEn: "Approved", icon: Check },
  "تحت الاعتماد": { color: "#f59e0b", bg: "#f59e0b14", labelAr: "تحت الاعتماد", labelEn: "Pending", icon: Clock },
  "جارى المراجعه للتقديم": { color: "#3b82f6", bg: "#3b82f614", labelAr: "جارى المراجعه", labelEn: "Review", icon: Eye },
  "ختامى": { color: "#a855f7", bg: "#a855f714", labelAr: "ختامى", labelEn: "Final", icon: Check },
  "لم يتم اعتماد السابق": { color: "#ef4444", bg: "#ef444414", labelAr: "لم يتم اعتماد السابق", labelEn: "Previous Not Approved", icon: AlertTriangle },
  "لا يوجد مستخلص": { color: "#64748b", bg: "#64748b14", labelAr: "لا يوجد مستخلص", labelEn: "No IPC", icon: Clock },
  "في انتظار النسخة المعتمدة": { color: "#06b6d4", bg: "#06b6d414", labelAr: "في انتظار النسخة المعتمدة", labelEn: "Awaiting Approved Copy", icon: Eye },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

const getReceivableBase = (inv: Invoice) => inv.approved_net_total > 0 ? inv.approved_net_total : inv.net_total;
const getOutstanding = (inv: Invoice) => Math.max(getReceivableBase(inv) - (inv.total_collections || 0), 0);

/* ─── Column Config ─────────────────────────────────────── */
const COLUMN_DEFS = [
  { id: "project", label: "Project", default: true },
  { id: "client", label: "Client", default: true },
  { id: "inv_num", label: "IPC #", default: true },
  { id: "contract", label: "Contract", default: true },
  { id: "submitted", label: "Submitted", default: true },
  { id: "approved", label: "Approved", default: true },
  { id: "collected", label: "Collected", default: true },
  { id: "outstanding", label: "Outstanding", default: true },
  { id: "progress", label: "Progress", default: true },
  { id: "status", label: "Status", default: true },
] as const;

type ColumnId = (typeof COLUMN_DEFS)[number]["id"];

const LS_COLS_KEY = "pzone_ipc_register_cols";
function loadColumnPrefs(): Set<ColumnId> {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_COLS_KEY) || "null");
    if (Array.isArray(saved)) return new Set(saved as ColumnId[]);
  } catch { /* column prefs not parseable — use defaults */ }
  return new Set(COLUMN_DEFS.filter((c) => c.default).map((c) => c.id));
}

/* ─── Status Badge ──────────────────────────────────────── */
function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["تحت الاعتماد"];
  const Icon = cfg.icon;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}
    >
      <Icon size={9} />
      {cfg.labelAr}
    </span>
  );
}

/* ─── Mini Progress (memoized to avoid animation replays on filter changes) ── */
const MiniProgress = React.memo(function MiniProgress({ pct, collected, approved }: { pct: number; collected: number; approved: number }) {
  const w = Math.min(pct * 100, 100);
  const collEff = approved > 0 ? collected / approved : 0;
  const collW = Math.min(collEff * 100, 100);
  return (
    <div className="space-y-1 w-32">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div style={{ width: `${w}%` }}
            className="h-full rounded-full bg-purple-500 transition-all duration-700" />
        </div>
        <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{fmtPct(pct)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div style={{ width: `${collW}%` }}
            className="h-full rounded-full transition-all duration-700"
            {...{ style: { width: `${collW}%`, background: collEff > 0.75 ? "#22c55e" : collEff > 0.4 ? "#f59e0b" : "#ef4444" } }} />
        </div>
        <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{fmtPct(collEff)}</span>
      </div>
      <div className="flex justify-between text-[8px] text-slate-600">
        <span>Contract%</span>
        <span>Collect%</span>
      </div>
    </div>
  );
});

/* ─── Inline Edit Cell ──────────────────────────────────── */
function InlineNumberCell({ value, onSave, color = "text-white" }: {
  value: number; onSave: (v: number) => void; color?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // BUG-8 fix: Sync draft with value prop so background refetches update display
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  };

  if (editing) {
    return (
      <input ref={inputRef} type="number" value={draft}
        onChange={(e) => setDraft(parseFloat(e.target.value) || 0)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        className="w-24 px-1.5 py-0.5 rounded bg-slate-700 border border-purple-500/50 text-xs text-white font-mono focus:outline-none"
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(value); }}
      className={`cursor-pointer hover:bg-white/5 px-1 py-0.5 rounded transition-all font-mono text-xs ${color} ${saved ? "!text-green-400" : ""}`}
      title="Click to edit"
    >
      {fmtMoney(value)}
      {saved && <Check size={9} className="inline ml-1 text-green-400" />}
    </span>
  );
}

/* ─── Status Quick Picker ───────────────────────────────── */
function StatusPicker({ current, onSelect, onClose }: {
  current: string; onSelect: (s: string) => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute z-50 right-0 top-full mt-1 rounded-xl border border-white/10 p-1.5 min-w-[180px]"
        style={{ background: "#0f172a", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}
      >
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => { onSelect(s); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 transition-all hover:bg-white/5"
              style={current === s ? { background: `${cfg.color}15`, color: cfg.color } : { color: "#94a3b8" }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: current === s ? cfg.color : "#334155" }} />
              {cfg.labelEn} / {cfg.labelAr}
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

/* ─── Column Toggle Dropdown ────────────────────────────── */
function ColumnToggle({ visible, onChange }: { visible: Set<ColumnId>; onChange: (s: Set<ColumnId>) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (id: ColumnId) => {
    const next = new Set(visible);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
    localStorage.setItem(LS_COLS_KEY, JSON.stringify(Array.from(next)));
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/10 transition-all">
        <Columns size={12} />Columns
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute right-0 top-full mt-1 z-50 rounded-xl border border-white/10 p-2 min-w-[160px]"
              style={{ background: "#0f172a", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
              {COLUMN_DEFS.map((col) => (
                <button key={col.id} onClick={() => toggle(col.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2 hover:bg-white/5 transition-all">
                  {visible.has(col.id)
                    ? <CheckSquare size={12} className="text-purple-400" />
                    : <Square size={12} className="text-slate-600" />}
                  <span className={visible.has(col.id) ? "text-white font-bold" : "text-slate-500"}>{col.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────── */
type SortKey = "project_code" | "contract_value" | "work_total" | "approved_total" | "total_collections" | "contract_percentage" | "outstanding";

interface Props {
  invoices: Invoice[];
  isLoading: boolean;
  isAdmin: boolean;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onProjectClick: (code: string) => void;
  onNew: () => void;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export function IPCRegisterTab({
  invoices, isLoading, isAdmin, onEdit, onDelete, onProjectClick, onNew,
}: Props) {
  const { user } = useAuth();
  const { data: trashItems = [] } = useDeletedInvoices();
  const restoreInvoice = useRestoreInvoice();
  const permanentDelete = usePermanentlyDeleteFromTrash();
  const [showTrash, setShowTrash] = useState(false);
  const update = useUpdateInvoice();

  /* ── State ── */
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("project_code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(loadColumnPrefs);
  const [statusPickerFor, setStatusPickerFor] = useState<string | null>(null);

  /* ── Search & Filter ── */
  const filtered = useMemo(() => {
    let result = invoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((inv) =>
        inv.project_code.toLowerCase().includes(q) ||
        inv.project_name.toLowerCase().includes(q) ||
        (inv.client || "").toLowerCase().includes(q) ||
        (inv.invoice_number || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter.length > 0) {
      result = result.filter((inv) => statusFilter.includes(inv.status));
    }
    return result;
  }, [invoices, search, statusFilter]);

  /* ── Sort ── */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "outstanding") {
        va = getOutstanding(a);
        vb = getOutstanding(b);
      } else {
        va = (a as any)[sortKey] ?? 0;
        vb = (b as any)[sortKey] ?? 0;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ── Selection ── */
  const allSelected = sorted.length > 0 && sorted.every((inv) => selected.has(inv.id));
  const someSelected = selected.size > 0;
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((inv) => inv.id)));
  };
  const clearSelection = () => setSelected(new Set());

  /* ── Bulk Delete — batch with single invalidation ── */
  const handleBulkDelete = () => {
    if (!isAdmin) return;
    const count = selected.size;
    if (!confirm(`هل تريد حذف ${count} مستخلص؟ سيتم نقلهم للمهملات (يمكن استرجاعهم خلال 30 يوم)\n\nDelete ${count} IPCs? They will be moved to trash (recoverable for 30 days).`)) return;
    // BUG-7 fix: Fire all deletes and only invalidate once at the end
    const ids = Array.from(selected);
    ids.forEach((id) => onDelete(id));
    clearSelection();
  };

  /* ── Single row delete with confirmation ── */
  const handleSingleDelete = (inv: Invoice) => {
    if (!isAdmin) return;
    if (!confirm(`حذف المستخلص ${inv.project_code} #${inv.invoice_number}?\nسيتم نقله للمهملات (30 يوم)\n\nDelete IPC ${inv.project_code} #${inv.invoice_number}?\nMoved to trash (30 days recovery).`)) return;
    onDelete(inv.id);
  };

  /* ── Inline Update Handlers ── */
  const handleInlineStatusChange = useCallback((inv: Invoice, newStatus: string) => {
    const updates: Partial<Invoice> & { id: string } = { id: inv.id, status: newStatus };
    if (newStatus === "معتمد" && !inv.approval_date) {
      updates.approval_date = new Date().toISOString().split("T")[0];
    }
    update.mutate(updates);
  }, [update]);

  const handleInlineCollectionChange = useCallback((inv: Invoice, amount: number) => {
    update.mutate({ id: inv.id, total_collections: amount });
  }, [update]);

  /* ── Sort Icon ── */
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUp size={9} className="text-slate-600" />;
    return sortDir === "asc" ? <ArrowUp size={9} className="text-purple-400" /> : <ArrowDown size={9} className="text-purple-400" />;
  };

  const Th = ({ label, k, right = false }: { label: React.ReactNode; k: SortKey; right?: boolean }) => (
    <th onClick={() => toggleSort(k)}
      className={`px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${right ? "text-right" : "text-left"}`}>
      <span className="inline-flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  );

  const col = (id: ColumnId) => visibleCols.has(id);

  /* ── Footer Totals ── */
  const totals = useMemo(() => {
    const contractValue = filtered.reduce((s, i) => s + i.contract_value, 0);
    const workTotal = filtered.reduce((s, i) => s + i.work_total, 0);
    const approvedTotal = filtered.reduce((s, i) => s + i.approved_total, 0);
    const collections = filtered.reduce((s, i) => s + i.total_collections, 0);
    const receivableBase = filtered.reduce((s, i) => s + getReceivableBase(i), 0);
    const outstanding = filtered.reduce((s, i) => s + getOutstanding(i), 0);
    const collectionEff = receivableBase > 0 ? collections / receivableBase : 0;
    const pendingCount = filtered.filter((i) => i.status === "تحت الاعتماد").length;
    const approvedCount = filtered.filter((i) => i.status === "معتمد").length;
    return { contractValue, workTotal, approvedTotal, collections, outstanding, collectionEff, pendingCount, approvedCount };
  }, [filtered]);

  /* ── Unique filter options ── */
  const filterOptions = useMemo(() => {
    const statuses = [...new Set(invoices.map((i) => i.status))];
    return { statuses };
  }, [invoices]);

  const hasFilters = search.trim() !== "" || statusFilter.length > 0;

  return (
    <div className="space-y-4">

      {/* ══════ SEARCH & FILTER BAR ══════ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] p-4"
        style={{ background: "linear-gradient(135deg, #0b1120, #131d35)" }}>
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project, client, IPC #..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/60 border border-white/[0.05] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/40 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-500 flex-shrink-0" />
            {filterOptions.statuses.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const active = statusFilter.includes(s);
              return (
                <button key={s}
                  onClick={() => setStatusFilter((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                  style={{
                    borderColor: active ? `${cfg?.color}88` : "rgba(255,255,255,0.06)",
                    background: active ? `${cfg?.color}20` : "transparent",
                    color: active ? cfg?.color : "#64748b",
                  }}>
                  {cfg?.labelEn || s}
                </button>
              );
            })}
          </div>

          {/* Column Toggle */}
          <ColumnToggle visible={visibleCols} onChange={setVisibleCols} />

          {/* Clear Filters */}
          {hasFilters && (
            <button onClick={() => { setSearch(""); setStatusFilter([]); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              <RotateCcw size={10} />Clear
            </button>
          )}

          {/* Results count */}
          <span className="text-[10px] text-slate-500 ml-auto">
            {filtered.length === invoices.length
              ? `${invoices.length} IPCs`
              : `${filtered.length} / ${invoices.length} IPCs`}
          </span>
        </div>
      </motion.div>

      {/* ══════ BULK ACTIONS BAR ══════ */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="rounded-xl border border-purple-500/30 px-4 py-2.5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.08), rgba(168,85,247,0.08))" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-purple-300">
                {selected.size} selected
              </span>
              <div className="h-4 w-px bg-white/10" />
              <button onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                <Trash2 size={11} />Delete Selected
              </button>
            </div>
            <button onClick={clearSelection}
              className="text-[11px] text-slate-400 hover:text-white transition-colors">
              Clear selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ TABLE ══════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a, #1a2540)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw size={24} className="animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Receipt size={48} className="mx-auto text-slate-600 mb-4" />
            {hasFilters ? (
              <>
                <p className="text-slate-400 text-lg font-semibold">No matching IPCs</p>
                <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters</p>
                <button onClick={() => { setSearch(""); setStatusFilter([]); }}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-lg font-semibold">No IPC records yet</p>
                <p className="text-slate-500 text-sm mt-1">Click "New IPC" in the top toolbar to create your first IPC</p>
                <button onClick={onNew}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                  + New IPC
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {/* Checkbox */}
                  <th className="px-3 py-3 w-8">
                    <button onClick={toggleAll}
                      className="text-slate-500 hover:text-white transition-colors">
                      {allSelected ? <CheckSquare size={14} className="text-purple-400" /> : <Square size={14} />}
                    </button>
                  </th>
                  {col("project") && <Th label="Project / المشروع" k="project_code" />}
                  {col("client") && <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Client</th>}
                  {col("inv_num") && <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">IPC #</th>}
                  {col("contract") && <Th label={<>Contract<br /><span className="text-slate-600 normal-case">قيمة العقد</span></>} k="contract_value" right />}
                  {col("submitted") && <Th label={<>Submitted<br /><span className="text-slate-600 normal-case">المقدم</span></>} k="work_total" right />}
                  {col("approved") && <Th label={<>Approved<br /><span className="text-slate-600 normal-case">المعتمد</span></>} k="approved_total" right />}
                  {col("collected") && <Th label={<>Collected<br /><span className="text-slate-600 normal-case">المحصل</span></>} k="total_collections" right />}
                  {col("outstanding") && <Th label={<>Outstanding<br /><span className="text-slate-600 normal-case">المتبقي</span></>} k="outstanding" right />}
                  {col("progress") && <Th label={<>Progress<br /><span className="text-slate-600 normal-case">النسبة</span></>} k="contract_percentage" />}
                  {col("status") && <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Status</th>}
                  <th className="sticky right-0 bg-slate-900/95 backdrop-blur z-10 px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => {
                  const outstanding = getOutstanding(inv);
                  const receivableBase = getReceivableBase(inv);
                  const isSelected = selected.has(inv.id);

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === inv.id ? null : inv.id)}
                        className={`border-b border-white/[0.03] cursor-pointer transition-colors group ${isSelected ? "bg-purple-500/[0.06]" : "hover:bg-white/[0.025]"}`}>

                        {/* Checkbox */}
                        <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(inv.id)}
                            className="text-slate-500 hover:text-white transition-colors">
                            {isSelected ? <CheckSquare size={14} className="text-purple-400" /> : <Square size={14} />}
                          </button>
                        </td>

                        {col("project") && (
                          <td className="sticky left-0 bg-slate-900/90 backdrop-blur z-10 px-4 py-3">
                            <div className="flex items-center gap-2">
                              {expandedRow === inv.id
                                ? <ChevronUp size={12} className="text-purple-400 flex-shrink-0" />
                                : <ChevronDown size={12} className="text-slate-500 group-hover:text-slate-300 flex-shrink-0" />}
                              <div>
                                <div className="font-bold text-white text-xs">{inv.project_code}</div>
                                <div className="text-[10px] text-slate-500 max-w-[180px] truncate">{inv.project_name}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {col("client") && (
                          <td className="px-3 py-3">
                            <span className="text-xs text-slate-300">{inv.client || "—"}</span>
                            {inv.sector && <div className="text-[10px] text-slate-500">{inv.sector}</div>}
                          </td>
                        )}
                        {col("inv_num") && <td className="px-3 py-3 text-xs text-slate-300 font-mono">{inv.invoice_number || "—"}</td>}
                        {col("contract") && <td className="px-3 py-3 text-right text-xs text-purple-300 font-mono">{fmtMoney(inv.contract_value)}</td>}
                        {col("submitted") && <td className="px-3 py-3 text-right text-xs text-blue-300 font-mono">{fmtMoney(inv.work_total)}</td>}
                        {col("approved") && <td className="px-3 py-3 text-right text-xs text-green-300 font-mono">{fmtMoney(inv.approved_total)}</td>}
                        {col("collected") && (
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <InlineNumberCell
                              value={inv.total_collections}
                              onSave={(v) => handleInlineCollectionChange(inv, v)}
                              color="text-amber-300"
                            />
                          </td>
                        )}
                        {col("outstanding") && (
                          <td className="px-3 py-3 text-right text-xs font-mono"
                            style={{ color: outstanding > 0 ? "#f87171" : "#4ade80" }}>
                            {fmtMoney(outstanding)}
                          </td>
                        )}
                        {col("progress") && (
                          <td className="px-3 py-3">
                            <MiniProgress
                              pct={inv.contract_percentage}
                              collected={inv.total_collections}
                              approved={receivableBase}
                            />
                          </td>
                        )}
                        {col("status") && (
                          <td className="px-3 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={inv.status} onClick={() => setStatusPickerFor(statusPickerFor === inv.id ? null : inv.id)} />
                            <AnimatePresence>
                              {statusPickerFor === inv.id && (
                                <StatusPicker
                                  current={inv.status}
                                  onSelect={(s) => handleInlineStatusChange(inv, s)}
                                  onClose={() => setStatusPickerFor(null)}
                                />
                              )}
                            </AnimatePresence>
                          </td>
                        )}
                        <td className="sticky right-0 bg-slate-900/95 backdrop-blur z-10 px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button title="Drilldown"
                              onClick={(e) => { e.stopPropagation(); onProjectClick(inv.project_code); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all">
                              <Eye size={13} />
                            </button>
                            <button title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(inv); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                              <Edit2 size={13} />
                            </button>
                            {isAdmin && (
                              <button title="Delete" onClick={(e) => { e.stopPropagation(); handleSingleDelete(inv); }}
                                className="p-1.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedRow === inv.id && (
                        <tr key={inv.id + "-detail"}>
                          <td colSpan={99} className="px-0 py-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 py-4 bg-slate-800/20 border-y border-white/[0.04]">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                  {/* Submitted */}
                                  <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 space-y-2">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase">Submitted / المقدم</div>
                                    <div className="space-y-1 text-[11px]">
                                      <div className="flex justify-between"><span className="text-slate-400">Previous</span><span className="text-white font-mono">{fmtFull(inv.work_previous)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">Current</span><span className="text-white font-mono">{fmtFull(inv.work_current)}</span></div>
                                      {inv.variations?.map((vo, i) => (
                                        <div key={i} className="flex justify-between pl-2 text-[10px] text-blue-300">
                                          <span className="truncate max-w-[120px]">{vo.vo_number || "VO"}: {vo.description}</span>
                                          <span className="font-mono">+{fmtFull(vo.amount)}</span>
                                        </div>
                                      ))}
                                      {(inv.fluctuation_amount || 0) > 0 && (
                                        <div className="flex justify-between text-[10px] text-blue-300 pl-2"><span>Fluctuation</span><span className="font-mono">+{fmtFull(inv.fluctuation_amount)}</span></div>
                                      )}
                                      <div className="flex justify-between border-t border-white/5 pt-1.5"><span className="text-blue-300 font-bold">Gross Total</span><span className="text-blue-300 font-mono font-bold">{fmtFull(inv.work_total)}</span></div>
                                      {inv.deductions_breakdown?.map((d, i) => (
                                        <div key={i} className="flex justify-between pl-2 text-[10px] text-red-300"><span className="truncate max-w-[120px]">{d.name}</span><span className="font-mono">-{fmtFull(d.amount)}</span></div>
                                      ))}
                                      <div className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-white font-black text-xs">Net</span><span className="text-white font-mono font-black text-xs">{fmtFull(inv.net_total)}</span></div>
                                    </div>
                                  </div>

                                  {/* Approved */}
                                  <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4 space-y-2">
                                    <div className="text-[10px] font-bold text-green-400 uppercase">Approved / المعتمد</div>
                                    <div className="space-y-1 text-[11px]">
                                      <div className="flex justify-between"><span className="text-slate-400">Previous</span><span className="text-white font-mono">{fmtFull(inv.approved_previous)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">Current</span><span className="text-white font-mono">{fmtFull(inv.approved_current)}</span></div>
                                      {inv.approved_variations?.map((vo, i) => (
                                        <div key={i} className="flex justify-between pl-2 text-[10px] text-green-300">
                                          <span className="truncate max-w-[120px]">{vo.vo_number || "VO"}: {vo.description}</span>
                                          <span className="font-mono">+{fmtFull(vo.amount)}</span>
                                        </div>
                                      ))}
                                      {(inv.approved_fluctuation_amount || 0) > 0 && (
                                        <div className="flex justify-between text-[10px] text-green-300 pl-2"><span>Fluctuation</span><span className="font-mono">+{fmtFull(inv.approved_fluctuation_amount)}</span></div>
                                      )}
                                      <div className="flex justify-between border-t border-white/5 pt-1.5"><span className="text-green-300 font-bold">Gross Total</span><span className="text-green-300 font-mono font-bold">{fmtFull(inv.approved_total)}</span></div>
                                      {inv.approved_deductions_breakdown?.map((d, i) => (
                                        <div key={i} className="flex justify-between pl-2 text-[10px] text-red-300"><span className="truncate max-w-[120px]">{d.name}</span><span className="font-mono">-{fmtFull(d.amount)}</span></div>
                                      ))}
                                      <div className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-white font-black text-xs">Net</span><span className="text-white font-mono font-black text-xs">{fmtFull(inv.approved_net_total)}</span></div>
                                    </div>
                                  </div>

                                  {/* Financial */}
                                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
                                    <div className="text-[10px] font-bold text-amber-400 mb-2 uppercase">Financial / مالي</div>
                                    <div className="space-y-2 text-[11px]">
                                      <div className="flex justify-between"><span className="text-slate-400">Collections</span><span className="text-amber-300 font-mono font-bold">{fmtFull(inv.total_collections)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">Outstanding</span><span className="font-mono font-bold" style={{ color: outstanding > 0 ? "#f87171" : "#4ade80" }}>{fmtFull(outstanding)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">Unbilled</span><span className="text-white font-mono">{fmtFull(inv.unbilled)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">Expected</span><span className="text-white font-mono">{fmtFull(inv.expected_collection)}</span></div>
                                      {receivableBase > 0 && (
                                        <div className="pt-2 border-t border-white/5">
                                          <div className="text-[10px] text-slate-500 mb-1">Collection Efficiency</div>
                                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full rounded-full transition-all"
                                              style={{
                                                width: `${Math.min((inv.total_collections / receivableBase) * 100, 100)}%`,
                                                background: (inv.total_collections / receivableBase) > 0.75 ? "#22c55e" : "#f59e0b",
                                              }} />
                                          </div>
                                          <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                            {fmtPct(inv.total_collections / receivableBase)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Status */}
                                  <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4">
                                    <div className="text-[10px] font-bold text-purple-400 mb-2 uppercase">Status / الحالة</div>
                                    <div className="space-y-2 text-[11px]">
                                      <StatusBadge status={inv.status} />
                                      {inv.submitted_date && <div className="text-slate-400">Submitted: <span className="text-white">{inv.submitted_date}</span></div>}
                                      {inv.approval_date && <div className="text-slate-400">Approved: <span className="text-white">{inv.approval_date}</span></div>}
                                      <div className="text-slate-400">Contract %: <span className="text-white font-mono">{fmtPct(inv.contract_percentage)}</span></div>
                                      {inv.approval_notes && (
                                        <div className="mt-2 p-2 rounded-lg bg-white/[0.02] text-[10px] text-slate-400 border border-white/5">
                                          {inv.approval_notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* ══════ ENHANCED FOOTER ══════ */}
              <tfoot>
                <tr className="border-t border-white/10 bg-slate-900/50">
                  <td className="px-3 py-3" /> {/* checkbox col */}
                  {col("project") && (
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-bold text-slate-400">
                        Totals — {filtered.length} invoices
                      </div>
                    </td>
                  )}
                  {col("client") && <td />}
                  {col("inv_num") && <td />}
                  {col("contract") && <td className="px-3 py-3 text-right text-xs font-black text-purple-300 font-mono">{fmtMoney(totals.contractValue)}</td>}
                  {col("submitted") && <td className="px-3 py-3 text-right text-xs font-black text-blue-300 font-mono">{fmtMoney(totals.workTotal)}</td>}
                  {col("approved") && <td className="px-3 py-3 text-right text-xs font-black text-green-300 font-mono">{fmtMoney(totals.approvedTotal)}</td>}
                  {col("collected") && <td className="px-3 py-3 text-right text-xs font-black text-amber-300 font-mono">{fmtMoney(totals.collections)}</td>}
                  {col("outstanding") && (
                    <td className="px-3 py-3 text-right text-xs font-black font-mono"
                      style={{ color: totals.outstanding > 0 ? "#f87171" : "#4ade80" }}>
                      {fmtMoney(totals.outstanding)}
                    </td>
                  )}
                  {col("progress") && (
                    <td className="px-3 py-3">
                      <div className="text-[10px] text-slate-500">
                        Eff: <span className="font-mono font-bold" style={{ color: totals.collectionEff > 0.75 ? "#22c55e" : "#f59e0b" }}>
                          {fmtPct(totals.collectionEff)}
                        </span>
                      </div>
                    </td>
                  )}
                  {col("status") && (
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {totals.pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle size={8} />{totals.pendingCount}
                          </span>
                        )}
                        {totals.approvedCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            <Check size={8} />{totals.approvedCount}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      {/* ══════ ADMIN TRASH PANEL ══════ */}
      {isAdmin && showTrash && trashItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-red-500/20 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.04), rgba(239,68,68,0.02))" }}
        >
          <div className="px-5 py-3 border-b border-red-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 size={14} className="text-red-400" />
              <span className="text-sm font-bold text-red-300">سلة المهملات / Trash ({trashItems.length})</span>
              <span className="text-[10px] text-slate-500">يتم الحذف نهائياً بعد 30 يوم</span>
            </div>
            <button onClick={() => setShowTrash(false)}
              className="text-slate-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {trashItems.map((item) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={item.invoice.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs font-bold text-white">{item.invoice.project_code}</span>
                      <span className="text-[10px] text-slate-500 ml-2">#{item.invoice.invoice_number}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{item.invoice.project_name}</span>
                    <span className="text-[10px] text-slate-600">
                      حذف بواسطة: {item.deleted_by || "Unknown"}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(item.deleted_at).toLocaleDateString("en-GB")}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${daysLeft <= 5 ? "bg-red-500/10 text-red-400" : "bg-slate-700 text-slate-400"}`}>
                      {daysLeft}d left
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restoreInvoice.mutate(item)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all">
                      <RotateCcw size={10} />استرجاع / Restore
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("حذف نهائي؟ لا يمكن التراجع\nPermanently delete? Cannot be undone.")) {
                          permanentDelete.mutate(item.invoice.id);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                      <X size={10} />حذف نهائي
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Trash toggle button for admins */}
      {isAdmin && trashItems.length > 0 && !showTrash && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowTrash(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-red-400/70 hover:text-red-300 bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-all">
            <Trash2 size={11} />سلة المهملات / Trash ({trashItems.length})
          </button>
        </div>
      )}
    </div>
  );
}
