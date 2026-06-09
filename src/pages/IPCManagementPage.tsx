import { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, ClipboardList, BarChart2,
  Plus, Share2, Link2, Copy, Check, RefreshCw, Download,
  Shield, X, Search, Filter, ChevronDown, Wallet,
  CloudDownload, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";

import { useInvoices, useDeleteInvoice, useInvoiceStats, getCurrentShareToken, getCurrentSignedUrl, useGenerateShareToken, buildShareUrl } from "@/hooks/useIPC";
import { useIPCProjects, syncAllProjectsToIPC } from "@/hooks/useIPCProjects";
import { useProjects } from "@/hooks/useProjects";
import { useUserRoles } from "@/hooks/useUserRoles";
import { fmtNum, fmtCompact } from "@/lib/utils";
import { seedIPCData, isSeedDone } from "@/data/seedImport";
import { useSheetSync, type MonthProgress } from "@/hooks/useSheetSync";
import { MONTH_CONFIGS } from "@/lib/sheetSync";

// PERF-1: Lazy-load heavy tab components (200KB+ total)
const IPCDashboardTab = lazy(() => import("@/components/ipc/IPCDashboardTab").then(m => ({ default: m.IPCDashboardTab })));
const IPCProjectsTab = lazy(() => import("@/components/ipc/IPCProjectsTab").then(m => ({ default: m.IPCProjectsTab })));
const IPCRegisterTab = lazy(() => import("@/components/ipc/IPCRegisterTab").then(m => ({ default: m.IPCRegisterTab })));
const IPCCashFlowTab = lazy(() => import("@/components/ipc/IPCCashFlowTab").then(m => ({ default: m.IPCCashFlowTab })));
const IPCAnalyticsTab = lazy(() => import("@/components/ipc/IPCAnalyticsTab").then(m => ({ default: m.IPCAnalyticsTab })));
import { IPCFormModal } from "@/components/ipc/IPCFormModal";
import { IPCProjectDrilldown } from "@/components/ipc/IPCProjectDrilldown";
import { IPCSystemHealthPanel } from "@/components/ipc/IPCSystemHealthPanel";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";

/* ─── Types ─────────────────────────────────────────────── */
const TABS = [
  { id: "dashboard", label: "Dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard, color: "#667eea" },
  { id: "projects", label: "Projects", labelAr: "المشاريع", icon: FolderOpen, color: "#a855f7" },
  { id: "register", label: "IPC Register", labelAr: "سجل المستخلصات", icon: ClipboardList, color: "#3b82f6" },
  { id: "cashflow", label: "Cash Flow", labelAr: "التدفقات النقدية", icon: Wallet, color: "#f59e0b" },
  { id: "analytics", label: "Analytics", labelAr: "التحليلات", icon: BarChart2, color: "#22c55e" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Share Modal ─────────────────────────────────────── */
function ShareSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-100 outline-none transition focus:border-purple-400/60"
      >
        <option value="">{placeholder}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const generate = useGenerateShareToken();
  const { data: invoices = [] } = useInvoices();
  const { data: projects = [] } = useIPCProjects();
  const [token, setToken] = useState<string | null>(getCurrentShareToken());
  const [signedUrl, setSignedUrl] = useState<string | null>(getCurrentSignedUrl());
  const [page, setPage] = useState<"overview" | "projects" | "clients" | "status">("overview");
  const [projectCode, setProjectCode] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [expiryDays, setExpiryDays] = useState("90");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);

  const projectManagerByCode = useMemo(() => {
    return Object.fromEntries(projects.map((p) => [p.project_code, p.project_manager || "Unassigned"]));
  }, [projects]);

  const shareChoices = useMemo(() => {
    const projectsList = [...new Set(invoices.map((i) => i.project_code).filter(Boolean))].sort();
    const clients = [...new Set(invoices.map((i) => i.client || "Unknown"))].sort();
    const statuses = [...new Set(invoices.map((i) => i.status).filter(Boolean))].sort();
    const months = [...new Set(invoices.map((i) => (i.submitted_date || i.approval_date || "").slice(0, 7)).filter(Boolean))].sort();
    const managers = [...new Set(projects.map((p) => p.project_manager || "Unassigned"))].sort();
    return { projectsList, clients, statuses, months, managers };
  }, [invoices, projects]);

  const shareOptions = useMemo(() => ({
    page,
    projectCodes: projectCode ? [projectCode] : undefined,
    clients: client ? [client] : undefined,
    statuses: status ? [status] : undefined,
    months: month ? [month] : undefined,
    projectManagers: projectManager ? [projectManager] : undefined,
    includeCharts,
    includeTables,
    expiresAt: expiryDays === "never" ? null : new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString(),
    projectManagerByCode,
  }), [page, projectCode, client, status, month, projectManager, includeCharts, includeTables, expiryDays, projectManagerByCode]);

  const scopedCount = useMemo(() => {
    return invoices.filter((inv) => {
      if (projectCode && inv.project_code !== projectCode) return false;
      if (client && (inv.client || "Unknown") !== client) return false;
      if (status && inv.status !== status) return false;
      if (month && (inv.submitted_date || inv.approval_date || "").slice(0, 7) !== month) return false;
      if (projectManager && (projectManagerByCode[inv.project_code] || "Unassigned") !== projectManager) return false;
      return true;
    }).length;
  }, [invoices, projectCode, client, status, month, projectManager, projectManagerByCode]);

  const url = (token && signedUrl) ? buildShareUrl(token, page) : null;

  const handleGenerate = async () => {
    const result = await generate.mutateAsync({ options: shareOptions });
    if (result) {
      setToken(result.token);
      setSignedUrl(result.signedUrl);
    }
  };

  const handleRevoke = async () => {
    await generate.mutateAsync({ revoke: true });
    setToken(null);
    setSignedUrl(null);
  };

  const handleCopy = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl border border-white/10 p-6"
        style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Share2 size={16} className="text-purple-400" />
              Share with Board / مشاركة مع المجلس
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Generate a read-only link for board members</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        {!token ? (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(102,126,234,0.1)", border: "1px solid rgba(102,126,234,0.2)" }}>
              <Link2 size={28} className="text-purple-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ShareSelect label="Page / الصفحة" value={page} onChange={(v) => setPage(v as typeof page)}
                options={[
                  ["overview", "Overview"],
                  ["projects", "Projects"],
                  ["clients", "Clients"],
                  ["status", "Status"],
                ]} />
              <ShareSelect label="Project / المشروع" value={projectCode} onChange={setProjectCode}
                options={shareChoices.projectsList.map((v) => [v, v])} placeholder="All projects" />
              <ShareSelect label="Client / العميل" value={client} onChange={setClient}
                options={shareChoices.clients.map((v) => [v, v])} placeholder="All clients" />
              <ShareSelect label="Month / الشهر" value={month} onChange={setMonth}
                options={shareChoices.months.map((v) => [v, v])} placeholder="All months" />
              <ShareSelect label="Status / الحالة" value={status} onChange={setStatus}
                options={shareChoices.statuses.map((v) => [v, v])} placeholder="All statuses" />
              <ShareSelect label="Project Manager / مدير المشروع" value={projectManager} onChange={setProjectManager}
                options={shareChoices.managers.map((v) => [v, v])} placeholder="All managers" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <ShareSelect
                label="Expiry / انتهاء الرابط"
                value={expiryDays}
                onChange={setExpiryDays}
                options={[
                  ["30", "30 days"],
                  ["90", "90 days"],
                  ["180", "180 days"],
                  ["never", "No expiry"],
                ]}
                placeholder="90 days"
              />
              <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
                Include charts
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                <input type="checkbox" checked={includeTables} onChange={(e) => setIncludeTables(e.target.checked)} />
                Include tables
              </label>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              This link will share <strong className="text-white">{scopedCount}</strong> IPC records as read-only data.
            </div>

            <button onClick={handleGenerate} disabled={generate.isPending}
              className="w-full px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              {generate.isPending ? "Generating..." : "Generate Share Link"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share Scope</div>
                  <div className="text-[11px] text-slate-500">Change filters, then click Refresh Data to update this link.</div>
                </div>
                <div className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                  {scopedCount} records
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ShareSelect label="Page / الصفحة" value={page} onChange={(v) => setPage(v as typeof page)}
                options={[
                  ["overview", "Overview"],
                  ["projects", "Projects"],
                  ["clients", "Clients"],
                  ["status", "Status"],
                ]} />
              <ShareSelect label="Project / المشروع" value={projectCode} onChange={setProjectCode}
                options={shareChoices.projectsList.map((v) => [v, v])} placeholder="All projects" />
              <ShareSelect label="Client / العميل" value={client} onChange={setClient}
                options={shareChoices.clients.map((v) => [v, v])} placeholder="All clients" />
              <ShareSelect label="Month / الشهر" value={month} onChange={setMonth}
                options={shareChoices.months.map((v) => [v, v])} placeholder="All months" />
              <ShareSelect label="Status / الحالة" value={status} onChange={setStatus}
                options={shareChoices.statuses.map((v) => [v, v])} placeholder="All statuses" />
              <ShareSelect label="Project Manager / مدير المشروع" value={projectManager} onChange={setProjectManager}
                options={shareChoices.managers.map((v) => [v, v])} placeholder="All managers" />
            </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ShareSelect
                  label="Expiry / انتهاء الرابط"
                  value={expiryDays}
                  onChange={setExpiryDays}
                  options={[
                    ["30", "30 days"],
                    ["90", "90 days"],
                    ["180", "180 days"],
                    ["never", "No expiry"],
                  ]}
                  placeholder="90 days"
                />
                <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                  <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
                  Include charts
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                  <input type="checkbox" checked={includeTables} onChange={(e) => setIncludeTables(e.target.checked)} />
                  Include tables
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-green-500/20 p-3"
              style={{ background: "rgba(34,197,94,0.06)" }}>
              <div className="text-[10px] font-bold text-green-400 uppercase mb-2">Active Share Link</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-[11px] text-slate-300 font-mono truncate border border-white/5">
                  {url}
                </div>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0"
                  style={copied
                    ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                    : { background: "rgba(102,126,234,0.1)", color: "#667eea" }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-[11px] text-amber-400/80 flex items-start gap-2">
              <Shield size={12} className="mt-0.5 flex-shrink-0" />
              <span>Anyone with this link can view the board report. Data is a snapshot — click <strong>Refresh Data</strong> to update after changes.</span>
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={handleRevoke} disabled={generate.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition">
                Revoke Link
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleGenerate} disabled={generate.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                  <RefreshCw size={12} className={generate.isPending ? "animate-spin" : ""} />
                  {generate.isPending ? "Updating..." : "Refresh Data"}
                </button>
                <button onClick={() => window.open(url!, "_blank")}
                  className="px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: "rgba(102,126,234,0.1)", color: "#667eea" }}>
                  Open Board View →
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Excel Export ─────────────────────────────────────── */
function exportToExcel(invoices: any[]) {
  const rows = invoices.map((inv) => ({
    "Project Code": inv.project_code,
    "Project Name": inv.project_name,
    "IPC #": inv.invoice_number,
    "Client": inv.client,
    "Status": inv.status,
    "Submitted Date": inv.submitted_date,
    "Gross Work": inv.work_total,
    "Tax": inv.tax_amount,
    "Tax Type": inv.tax_type,
    "Total Deductions": inv.total_deductions,
    "Net Submitted": inv.net_total,
    "Approved Gross": inv.approved_total,
    "Approved Tax": inv.approved_tax_amount,
    "Approved Deductions": inv.approved_deductions,
    "Net Approved": inv.approved_net_total,
    "Collections": inv.total_collections,
    "Outstanding": Math.max(((inv.approved_net_total || 0) > 0 ? inv.approved_net_total : inv.net_total || 0) - (inv.total_collections || 0), 0),
    "Contract Value": inv.contract_value,
    "Approval Date": inv.approval_date,
    "Collection Date": inv.collection_date,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "IPC Register");
  XLSX.writeFile(wb, `IPC_Register_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function IPCManagementPage() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: projects = [] } = useIPCProjects();
  const { data: ongoingProjects } = useProjects();
  const { data: stats } = useInvoiceStats();
  const financial = useFinancialSnapshot();
  const deleteInvoice = useDeleteInvoice();

  // One-time seed: import real data from Excel IPC Log
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || isSeedDone()) return;
    seededRef.current = true;
    seedIPCData().then(({ projects: p, ipcs: i }) => {
      if (p > 0 || i > 0) {
        console.log(`[IPC Seed] Imported ${p} projects and ${i} IPCs from Excel data`);
      }
    }).catch((err) => console.warn("[IPC Seed] Error:", err));
  }, []);

  // One-time sync: backfill ongoing_projects → ipc_projects
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current || !ongoingProjects?.length) return;
    syncedRef.current = true;
    syncAllProjectsToIPC(ongoingProjects).catch(() => {});
  }, [ongoingProjects]);

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [drilldownCode, setDrilldownCode] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedSyncSheets, setSelectedSyncSheets] = useState<string[]>([]);
  const sheetSync = useSheetSync();

  useEffect(() => {
    if (sheetSync.isRunning || sheetSync.months.length > 0) return;
    setSelectedSyncSheets((current) => {
      const availableKeys = sheetSync.availableMonths.map((month) => month.key);
      const retained = current.filter((key) => availableKeys.includes(key));
      return retained.length > 0 ? retained : availableKeys;
    });
  }, [sheetSync.availableMonths, sheetSync.isRunning, sheetSync.months.length]);

  // Real admin check from user roles
  const { isAdmin, user } = useUserRoles();

  const handleNew = () => { setEditingInvoice(null); setShowFormModal(true); };
  const handleEdit = (inv: any) => { setEditingInvoice(inv); setShowFormModal(true); };
  const handleDelete = (id: string) => {
    deleteInvoice.mutate({ id, userEmail: user?.email || null });
  };

  const toggleSyncSheet = (monthKey: string) => {
    if (sheetSync.isRunning || sheetSync.months.length > 0) return;
    setSelectedSyncSheets((current) =>
      current.includes(monthKey)
        ? current.filter((key) => key !== monthKey)
        : [...current, monthKey],
    );
  };

  const syncSheetOptions = sheetSync.months.length > 0
    ? sheetSync.months
    : (sheetSync.availableMonths.length ? sheetSync.availableMonths : MONTH_CONFIGS).map((c) => ({
        monthKey: c.key,
        label: c.label,
        status: "idle" as const,
      }));

  const headerStats = [
    { label: "Projects", value: String(financial.portfolio.project_count || new Set(invoices.map((i) => i.project_code)).size), color: "#c5a880" },
    { label: "IPCs", value: String(invoices.length), color: "#c5a880" },
    { label: "Submitted", value: fmtCompact(financial.portfolio.total_submitted || stats?.totalSubmitted || 0), color: "#dfc9ab" },
    { label: "Approved", value: fmtCompact(financial.portfolio.total_approved_net || stats?.totalApproved || 0), color: "#c5a880" },
    { label: "Collected", value: fmtCompact(financial.portfolio.total_collections || stats?.totalCollections || 0), color: "#dfc9ab" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 border-b border-[#c5a880]/15 bg-background/95 backdrop-blur-md">
        <div className="px-6 py-3.5">
          <div className="flex items-center justify-between flex-wrap gap-3">

            {/* Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #c5a880, #dfc9ab)", boxShadow: "0 4px 20px rgba(197,168,128,0.2)" }}>
                <ClipboardList size={18} className="text-black" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-light tracking-widest text-[#c5a880] uppercase font-editorial-serif leading-none">IPC Command Center</h1>
                <p className="text-[10px] text-zinc-400 font-light tracking-wide mt-1">
                  Interim Payment Certificates <span className="text-[#c5a880]/50 italic font-editorial-serif">/ المستخلصات</span>
                </p>
              </div>
            </div>

            {/* Mini stats strip */}
            <div className="hidden lg:flex items-center gap-6">
              {headerStats.map((s) => (
                <div key={s.label} className="text-center px-3 border-r border-[#c5a880]/10 last:border-r-0">
                  <div className="text-sm font-light font-luxury-serif" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { setShowSyncModal(true); sheetSync.loadMonths(); }}
                title="Sync from Google Sheet"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-none text-xs font-semibold font-sans border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all duration-300">
                <CloudDownload size={13} />Sync Sheet
              </button>
              <button onClick={() => exportToExcel(invoices)}
                title="Export to Excel"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-none text-xs font-semibold font-sans border border-[#c5a880]/30 text-[#c5a880] hover:bg-[#c5a880]/10 hover:border-[#c5a880] transition-all duration-300">
                <Download size={13} />Excel
              </button>
              <button onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-none text-xs font-semibold font-sans border border-[#c5a880]/30 text-[#c5a880] hover:bg-[#c5a880]/10 hover:border-[#c5a880] transition-all duration-300">
                <Share2 size={13} />Share
              </button>
              <button onClick={handleNew}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-none font-sans font-black text-xs uppercase tracking-wider text-black transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #c5a880, #dfc9ab)", boxShadow: "0 2px 12px rgba(197, 168, 128, 0.2)" }}>
                <Plus size={13} strokeWidth={3} />New IPC
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto no-scrollbar border-t border-[#c5a880]/10 pt-2.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 uppercase tracking-widest font-sans"
                  style={isActive
                    ? { color: "#c5a880", borderBottom: "2px solid #c5a880" }
                    : { color: "#71717a" }}>
                  <Icon size={12} className={isActive ? "text-[#c5a880]" : "text-zinc-500"} />
                  <span>{tab.label}</span>
                  <span className="opacity-50 text-[9px] font-editorial-serif italic">/ {tab.labelAr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-6">
        <IPCSystemHealthPanel isAdmin={isAdmin} />

        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
        }>
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IPCDashboardTab
                invoices={invoices}
                isLoading={isLoading}
                onProjectClick={setDrilldownCode}
                onShare={() => setShowShareModal(true)}
              />
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IPCProjectsTab isAdmin={isAdmin} />
            </motion.div>
          )}

          {activeTab === "register" && (
            <motion.div key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IPCRegisterTab
                invoices={invoices}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onProjectClick={setDrilldownCode}
                onNew={handleNew}
              />
            </motion.div>
          )}

          {activeTab === "cashflow" && (
            <motion.div key="cashflow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IPCCashFlowTab invoices={invoices} projects={projects} />
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IPCAnalyticsTab invoices={invoices} projects={projects} />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showFormModal && (
          <IPCFormModal
            invoice={editingInvoice}
            onClose={() => { setShowFormModal(false); setEditingInvoice(null); }}
          />
        )}
        {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}

        {/* ── Sync Modal ── */}
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !sheetSync.isRunning && setShowSyncModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                    <CloudDownload size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Sync from Google Sheet</h2>
                    <p className="text-[10px] text-muted-foreground">Import IPC data from Pzone Invoices 2026</p>
                  </div>
                </div>
                {!sheetSync.isRunning && (
                  <button onClick={() => setShowSyncModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Month List */}
              <div className="px-6 py-4 space-y-2 max-h-[360px] overflow-y-auto">
                {sheetSync.isLoadingMonths && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    Loading sheet tabs...
                  </div>
                )}
                {sheetSync.monthLoadError && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                    {sheetSync.monthLoadError}. Showing saved tabs.
                  </div>
                )}
                {!sheetSync.isRunning && sheetSync.months.length === 0 && (
                  <div className="flex items-center justify-between gap-3 px-1 pb-2 text-[11px]">
                    <span className="text-muted-foreground">
                      {selectedSyncSheets.length} of {syncSheetOptions.length} selected
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSyncSheets(syncSheetOptions.map((month) => month.monthKey))}
                        className="font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSyncSheets([])}
                        className="font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                {syncSheetOptions.map((month) => {
                  const selected = selectedSyncSheets.includes(month.monthKey);
                  const canToggle = !sheetSync.isRunning && sheetSync.months.length === 0;
                  return (
                  <button
                    type="button"
                    key={month.monthKey}
                    onClick={() => canToggle && toggleSyncSheet(month.monthKey)}
                    className={`flex w-full items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                      selected && canToggle
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-border bg-muted/30"
                    } ${canToggle ? "hover:border-emerald-500/40" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-3">
                      {month.status === "done" && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {month.status === "error" && <AlertCircle size={16} className="text-red-400" />}
                      {(month.status === "fetching" || month.status === "syncing") && (
                        <Loader2 size={16} className="text-blue-400 animate-spin" />
                      )}
                      {month.status === "idle" && (
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                          selected ? "border-emerald-400 bg-emerald-400" : "border-muted-foreground/30"
                        }`}>
                          {selected && <Check size={10} className="text-black" strokeWidth={3} />}
                        </div>
                      )}
                      <span className="text-sm font-medium text-foreground">{month.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {month.status === "fetching" && "Downloading..."}
                      {month.status === "syncing" && "Uploading..."}
                      {month.status === "done" && month.result && (
                        <span className="text-emerald-400">
                          {month.result.total} IPC rows • {month.result.updated} updated, {month.result.inserted} new
                          {(month.result.collectionsInserted + month.result.collectionsUpdated) > 0
                            ? ` • ${month.result.collectionsInserted} collections new, ${month.result.collectionsUpdated} collections updated`
                            : ""}
                        </span>
                      )}
                      {month.status === "error" && (
                        <span className="text-red-400">{month.error || "Failed"}</span>
                      )}
                    </div>
                  </button>
                )})}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {sheetSync.isRunning
                    ? `Syncing ${sheetSync.completedCount}/${sheetSync.totalCount}...`
                    : sheetSync.completedCount > 0
                      ? `Completed ${sheetSync.completedCount}/${sheetSync.totalCount} sheets`
                      : `Ready to sync ${selectedSyncSheets.length} selected sheet${selectedSyncSheets.length === 1 ? "" : "s"}`}
                </div>
                <div className="flex items-center gap-2">
                  {sheetSync.isRunning ? (
                    <button
                      onClick={sheetSync.abort}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Abort
                    </button>
                  ) : (
                    <button
                      onClick={() => sheetSync.startSync(selectedSyncSheets)}
                      disabled={selectedSyncSheets.length === 0}
                      className="px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      <span className="flex items-center gap-1.5">
                        <CloudDownload size={13} />
                        Sync Selected
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drilldown Panel ── */}
      <IPCProjectDrilldown
        projectCode={drilldownCode}
        invoices={invoices}
        onClose={() => setDrilldownCode(null)}
      />
    </div>
  );
}
