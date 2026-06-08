import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Percent, ChevronDown, ChevronRight,
  Check, RefreshCw, AlertCircle, Info,
} from "lucide-react";
import { fmtNum } from "@/lib/utils";
import {
  useCreateInvoice, useUpdateInvoice, useNextInvoiceNumber,
  type Invoice, type InvoiceInput, type DeductionItem, type VariationItem,
} from "@/hooks/useIPC";
import { useIPCProjects, totalAuthorized, type IPCProject } from "@/hooks/useIPCProjects";

const fmtFull = (v: number) => fmtNum(v);

/* ─── Tax Options ─────────────────────────────────────── */
const TAX_OPTIONS = [
  { value: "none", label: "No Tax / بدون ضريبة", rate: 0 },
  { value: "5%", label: "5% VAT / ضريبة 5%", rate: 0.05 },
  { value: "5.04%", label: "5.04% / ضريبة 5.04%", rate: 0.0504 },
  { value: "14%", label: "14% VAT / ضريبة 14%", rate: 0.14 },
  { value: "custom", label: "Custom % / نسبة مخصصة", rate: null },
] as const;

const DIRECTION_OPTIONS = [
  { value: "added", label: "Added / مضافة (Contractor charges client)" },
  { value: "withheld", label: "Withheld / محتجزة (Deducted from payment)" },
];

/* ─── Helpers ─────────────────────────────────────────── */
function calcTax(gross: number, type: string, customPct: number, direction: string): number {
  const opt = TAX_OPTIONS.find((t) => t.value === type);
  const rate = opt?.rate ?? (customPct / 100);
  return Math.round(gross * rate * 100) / 100;
}

function parsePercent(name: string): number | null {
  const m = name.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function recalcDeductions(breakdown: DeductionItem[], gross: number): DeductionItem[] {
  return breakdown.map((d) => {
    const pct = parsePercent(d.name);
    if (pct !== null) return { ...d, amount: Math.round((pct / 100) * gross * 100) / 100 };
    return d;
  });
}

/* ─── Section Components ──────────────────────────────── */
function SectionHeader({ title, color, children }: { title: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-xs font-bold uppercase flex items-center gap-2" style={{ color }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function NumInput({ label, value, onChange, readOnly = false, mono = true, color = "" }: {
  label: string; value: number; onChange: (v: number) => void;
  readOnly?: boolean; mono?: boolean; color?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{label}</label>
      <input type="number" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        readOnly={readOnly}
        className={`w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none focus:border-purple-500/50 ${mono ? "font-mono" : ""} ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
        style={color ? { color } : {}} />
    </div>
  );
}

function NetSummaryRow({ label, value, color, bold = false, border = false }: {
  label: string; value: number; color: string; bold?: boolean; border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-[11px] py-1.5 ${border ? "border-t border-white/10 mt-1 pt-2" : ""}`}>
      <span className={bold ? "font-bold text-white" : "text-slate-400"}>{label}</span>
      <span className={`font-mono ${bold ? "text-base font-black" : "font-semibold"}`} style={{ color }}>
        {fmtFull(value)}
      </span>
    </div>
  );
}

/* ─── Main Form Modal ─────────────────────────────────── */
interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

const EMPTY_FORM: Partial<InvoiceInput> = {
  project_code: "", project_name: "", client: null, sector: null, contract_value: 0,
  invoice_number: "", invoice_type: "submitted", linked_submitted_id: null,
  status: "تحت الاعتماد", submitted_date: "", approval_date: null, collection_date: null,
  approval_notes: null,
  // Submitted
  work_previous: 0, work_current: 0, fluctuation_amount: 0,
  variations: [], deductions_breakdown: [],
  tax_type: "none", tax_amount: 0, tax_direction: "added",
  // Approved
  approved_previous: 0, approved_current: 0, approved_fluctuation_amount: 0,
  approved_variations: [], approved_deductions_breakdown: [],
  approved_tax_type: "none", approved_tax_amount: 0, approved_tax_direction: "added",
  // Collections
  total_collections: 0, unbilled: 0, expected_collection: 0,
  // Computed (will be recalculated)
  work_total: 0, total_deductions: 0, net_total: 0,
  net_previous: 0, net_current: 0,
  approved_total: 0, approved_deductions: 0, approved_net_total: 0,
  approved_net_previous: 0, approved_net_current: 0,
  contract_percentage: 0,
  ipc_project_id: null, share_token: null,
};

export function IPCFormModal({ invoice, onClose }: Props) {
  const { data: allProjects = [] } = useIPCProjects();
  const create = useCreateInvoice();
  const update = useUpdateInvoice();

  const [form, setForm] = useState<Partial<InvoiceInput>>(invoice ? { ...invoice } : { ...EMPTY_FORM });
  const [customTaxPct, setCustomTaxPct] = useState(0);
  const [customApprovedTaxPct, setCustomApprovedTaxPct] = useState(0);
  const [activeSection, setActiveSection] = useState<"submitted" | "approved" | "collections" | "status">("submitted");
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);

  /* ─ Auto-fill from project selection ─ */
  const selectedProject = useMemo(
    () => allProjects.find((p) => p.project_code === form.project_code) || null,
    [allProjects, form.project_code]
  );

  const { data: nextNum } = useNextInvoiceNumber(form.project_code || null);

  useEffect(() => {
    if (!invoice && nextNum && form.project_code) {
      setForm((f) => ({ ...f, invoice_number: nextNum }));
    }
  }, [nextNum, form.project_code, invoice]);

  const fillFromProject = useCallback((proj: IPCProject) => {
    const allVOs = proj.variation_orders.filter((vo) => vo.status === "approved");
    setForm((f) => ({
      ...f,
      project_code: proj.project_code,
      project_name: proj.project_name,
      client: proj.client || f.client,
      sector: proj.sector || f.sector,
      contract_value: proj.contract_value,
      ipc_project_id: proj.id,
      variations: allVOs.map((vo) => ({ vo_number: vo.vo_number, description: vo.description, amount: 0 })),
      approved_variations: allVOs.map((vo) => ({ vo_number: vo.vo_number, description: vo.description, amount: 0 })),
    }));
  }, []);

  /* ─ Live calculations ─ */
  const sub = useMemo(() => {
    const voTotal = (form.variations || []).reduce((s, v) => s + (v.amount || 0), 0);
    // Gross includes fluctuation for the total display
    const gross = (form.work_previous || 0) + (form.work_current || 0) + voTotal + (form.fluctuation_amount || 0);
    // Deductions are calculated from gross WITHOUT fluctuation (per user requirement)
    const grossForDeductions = (form.work_previous || 0) + (form.work_current || 0) + voTotal;
    const dedTotal = (form.deductions_breakdown || []).reduce((s, d) => s + (d.amount || 0), 0);
    const afterDed = gross - dedTotal;
    const taxAmt = calcTax(gross, form.tax_type || "none", customTaxPct, form.tax_direction || "added");
    const net = form.tax_direction === "added" ? afterDed + taxAmt : afterDed - taxAmt;
    return { gross, grossForDeductions, voTotal, dedTotal, taxAmt, afterDed, net };
  }, [form.work_previous, form.work_current, form.fluctuation_amount, form.variations,
      form.deductions_breakdown, form.tax_type, form.tax_direction, customTaxPct]);

  const appr = useMemo(() => {
    const voTotal = (form.approved_variations || []).reduce((s, v) => s + (v.amount || 0), 0);
    const gross = (form.approved_previous || 0) + (form.approved_current || 0) + voTotal + (form.approved_fluctuation_amount || 0);
    const grossForDeductions = (form.approved_previous || 0) + (form.approved_current || 0) + voTotal;
    const dedTotal = (form.approved_deductions_breakdown || []).reduce((s, d) => s + (d.amount || 0), 0);
    const afterDed = gross - dedTotal;
    const taxAmt = calcTax(gross, form.approved_tax_type || "none", customApprovedTaxPct, form.approved_tax_direction || "added");
    const net = form.approved_tax_direction === "added" ? afterDed + taxAmt : afterDed - taxAmt;
    return { gross, grossForDeductions, voTotal, dedTotal, taxAmt, afterDed, net };
  }, [form.approved_previous, form.approved_current, form.approved_fluctuation_amount, form.approved_variations,
      form.approved_deductions_breakdown, form.approved_tax_type, form.approved_tax_direction, customApprovedTaxPct]);

  /* ─ Update tax amount when type changes ─ */
  const handleTaxTypeChange = (type: string, side: "sub" | "app") => {
    const gross = side === "sub" ? sub.gross : appr.gross;
    const pct = side === "sub" ? customTaxPct : customApprovedTaxPct;
    const amt = calcTax(gross, type, pct, "added");
    if (side === "sub") setForm((f) => ({ ...f, tax_type: type, tax_amount: amt }));
    else setForm((f) => ({ ...f, approved_tax_type: type, approved_tax_amount: amt }));
  };

  /* ─ Deduction helpers ─ */
  const addDed = (side: "sub" | "app") => {
    const key = side === "sub" ? "deductions_breakdown" : "approved_deductions_breakdown";
    setForm((f) => ({ ...f, [key]: [...(f[key] || []), { name: "", amount: 0 }] }));
  };

  const updateDed = (side: "sub" | "app", idx: number, field: keyof DeductionItem, val: string | number) => {
    const key = side === "sub" ? "deductions_breakdown" : "approved_deductions_breakdown";
    // Use grossForDeductions (without fluctuation) for percentage-based deductions
    const grossBase = side === "sub" ? sub.grossForDeductions : appr.grossForDeductions;
    setForm((f) => {
      const arr = [...(f[key] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      if (field === "name") {
        const pct = parsePercent(val as string);
        if (pct !== null) arr[idx].amount = Math.round((pct / 100) * grossBase * 100) / 100;
      }
      return { ...f, [key]: arr };
    });
  };

  const removeDed = (side: "sub" | "app", idx: number) => {
    const key = side === "sub" ? "deductions_breakdown" : "approved_deductions_breakdown";
    setForm((f) => ({ ...f, [key]: (f[key] || []).filter((_, j) => j !== idx) }));
  };

  /* ─ VO helpers ─ */
  const updateVO = (side: "sub" | "app", idx: number, field: keyof VariationItem, val: string | number) => {
    const key = side === "sub" ? "variations" : "approved_variations";
    setForm((f) => {
      const arr = [...(f[key] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...f, [key]: arr };
    });
  };

  /* ─ Save ─ */
  const handleSave = () => {
    if (!form.project_code || !form.project_name) return;
    const payload: Partial<InvoiceInput> = {
      ...form,
      work_total: sub.gross,
      total_deductions: sub.dedTotal,
      tax_amount: sub.taxAmt,
      net_total: sub.net,
      net_previous: form.work_previous || 0,
      net_current: sub.net - (form.work_previous || 0),
      approved_total: appr.gross,
      approved_deductions: appr.dedTotal,
      approved_tax_amount: appr.taxAmt,
      approved_net_total: appr.net,
      approved_net_previous: form.approved_previous || 0,
      approved_net_current: appr.net - (form.approved_previous || 0),
      contract_percentage: (form.contract_value || 0) > 0 ? sub.gross / form.contract_value! : 0,
    };
    if (invoice) {
      update.mutate({ id: invoice.id, ...payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  /* ─ Section tabs ─ */
  const sections = [
    { id: "submitted", label: "Submitted / المقدم", color: "#3b82f6" },
    { id: "approved", label: "Approved / المعتمد", color: "#22c55e" },
    { id: "collections", label: "Collections / التحصيل", color: "#f59e0b" },
    { id: "status", label: "Status / الحالة", color: "#a855f7" },
  ] as const;

  /* ─ Tax selector component ─ */
  const TaxSelector = ({
    taxType, taxDirection, taxAmount, customPct,
    onTypeChange, onDirectionChange, onCustomPct,
    gross,
  }: {
    taxType: string; taxDirection: string; taxAmount: number; customPct: number;
    onTypeChange: (v: string) => void; onDirectionChange: (v: string) => void;
    onCustomPct: (v: number) => void; gross: number;
  }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Tax Type / نوع الضريبة</label>
          <select value={taxType} onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none">
            {TAX_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Direction / الاتجاه</label>
          <select value={taxDirection} onChange={(e) => onDirectionChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none">
            {DIRECTION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>
      {taxType === "custom" && (
        <div className="flex items-center gap-2">
          <input type="number" value={customPct} onChange={(e) => onCustomPct(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 7.5"
            className="w-28 px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white font-mono focus:outline-none" />
          <span className="text-slate-400 text-sm">%</span>
          <span className="text-[11px] text-slate-500">
            = <span className="text-white font-mono">{fmtFull(Math.round((customPct / 100) * gross * 100) / 100)}</span> EGP
          </span>
        </div>
      )}
      {taxType !== "none" && (
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px]">
          <Info size={11} className="text-slate-500 flex-shrink-0" />
          <span className="text-slate-400">
            Tax Amount: <span className="text-white font-mono font-bold">{fmtFull(taxAmount)}</span> EGP
            {taxDirection === "added" ? " added on top" : " withheld from payment"}
          </span>
        </div>
      )}
    </div>
  );

  /* ─ Deduction builder component ─ */
  const DeductionBuilder = ({ side, grossBase }: { side: "sub" | "app"; grossBase: number }) => {
    const key = side === "sub" ? "deductions_breakdown" : "approved_deductions_breakdown";
    const items = (form[key] || []) as DeductionItem[];
    const color = side === "sub" ? "#3b82f6" : "#22c55e";
    const totalDed = items.reduce((s, d) => s + (d.amount || 0), 0);
    return (
      <div className="space-y-2">
        <SectionHeader title="Deductions / الاستقطاعات" color={color}>
          <button type="button" onClick={() => addDed(side)}
            className="text-[10px] font-bold flex items-center gap-1 hover:opacity-80" style={{ color }}>
            <Plus size={10} />Add Deduction
          </button>
        </SectionHeader>
        {items.length === 0 && (
          <p className="text-[11px] text-slate-600 italic">No deductions — add retention, bond, etc.</p>
        )}
        {items.map((d, i) => {
          const isPct = parsePercent(d.name) !== null;
          return (
            <div key={`${side}-ded-${i}`} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  defaultValue={d.name}
                  onBlur={(e) => updateDed(side, i, "name", e.target.value)}
                  onChange={(e) => {
                    // Only auto-calc when typing a percentage pattern
                    const pct = parsePercent(e.target.value);
                    if (pct !== null) updateDed(side, i, "name", e.target.value);
                  }}
                  placeholder='e.g. "Retention 5%" or "Performance Bond"'
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white focus:outline-none pr-12" />
                {isPct && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-purple-400 flex items-center gap-0.5">
                    <Percent size={8} />auto
                  </span>
                )}
              </div>
              <input
                key={`${side}-amt-${i}-${isPct ? d.amount : ""}`}
                type="number"
                defaultValue={d.amount}
                readOnly={isPct}
                onBlur={(e) => {
                  if (!isPct) updateDed(side, i, "amount", parseFloat(e.target.value) || 0);
                }}
                className={`w-32 px-2.5 py-2 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none ${isPct ? "opacity-60 cursor-not-allowed" : ""}`} />
              <button type="button" onClick={() => removeDed(side, i)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
        {items.length > 0 && (
          <>
            <p className="text-[10px] text-slate-500">
              💡 Tip: Type "5%" in the name to auto-calculate from gross total (without fluctuation)
            </p>
            {/* Total Deductions row */}
            <div className="flex items-center justify-between px-2 py-2 rounded-lg border border-white/10 bg-slate-800/50 mt-1">
              <span className="text-[11px] font-bold text-red-300">إجمالي الاستقطاعات / Total Deductions</span>
              <span className="text-xs font-mono font-black text-red-400">{fmtFull(totalDed)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a1628, #111827)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Fixed Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">
              {invoice ? "Edit IPC / تعديل المستخلص" : "New IPC / مستخلص جديد"}
            </h2>
            {form.project_code && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {form.project_code} — {form.project_name} — IPC #{form.invoice_number || "?"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Project & IPC Identity ── */}
          <div className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(102,126,234,0.05)" }}>
            <h4 className="text-xs font-bold text-purple-400 uppercase mb-4">IPC Identity / هوية المستخلص</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              {/* Project picker */}
              <div className="md:col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Project / المشروع</label>
                <select value={form.project_code || ""}
                  onChange={(e) => {
                    const proj = allProjects.find((p) => p.project_code === e.target.value);
                    if (proj) fillFromProject(proj);
                    else setForm((f) => ({ ...f, project_code: e.target.value }));
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  <option value="">— Select Project —</option>
                  {allProjects.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.project_code}>
                      {p.project_code} — {p.project_name.substring(0, 35)}
                    </option>
                  ))}
                </select>
              </div>

              {/* IPC Number */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                  IPC # / رقم المستخلص
                  {nextNum && !invoice && (
                    <span className="ml-1 text-purple-400 normal-case font-normal">(next: {nextNum})</span>
                  )}
                </label>
                <input value={form.invoice_number || ""}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50" />
              </div>

              {/* Auto-filled read-only fields */}
              {[
                { label: "Client / العميل", value: form.client || "—" },
                { label: "Contract Value / قيمة العقد", value: form.contract_value ? `EGP ${fmtFull(form.contract_value)}` : "—" },
                { label: "Sector / القطاع", value: form.sector || "—" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{field.label}</label>
                  <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-white/[0.03] text-sm text-slate-300 font-mono">
                    {field.value}
                  </div>
                </div>
              ))}

              {/* Submitted Date */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Submitted Date / تاريخ التقديم</label>
                <input type="date" value={form.submitted_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, submitted_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none focus:border-purple-500/50" />
              </div>
            </div>

            {/* VOs from project */}
            {selectedProject && selectedProject.variation_orders.filter((v) => v.status === "approved").length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <p className="text-[10px] text-purple-400 font-bold mb-1">
                  ✓ Project has {selectedProject.variation_orders.filter((v) => v.status === "approved").length} approved VOs — enter amounts below
                </p>
                <p className="text-[10px] text-slate-500">
                  Total authorized: EGP {fmtFull(totalAuthorized(selectedProject))}
                </p>
              </div>
            )}
          </div>

          {/* ── Section Tabs ── */}
          <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-white/[0.04]">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all"
                style={activeSection === s.id
                  ? { background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}33` }
                  : { color: "#64748b" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* ── SUBMITTED SECTION ── */}
          <AnimatePresence mode="wait">
            {activeSection === "submitted" && (
              <motion.div key="submitted" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-blue-500/20 p-5 space-y-5"
                style={{ background: "rgba(59,130,246,0.04)" }}>
                <SectionHeader title="📤 Submitted Work / الأعمال المقدمة" color="#3b82f6" />

                {/* Previous + Current */}
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Previous Work / سابق" value={form.work_previous || 0}
                    onChange={(v) => setForm((f) => {
                      // Auto-sync to approved_previous if it hasn't been manually changed
                      const syncApprPrev = (f.approved_previous || 0) === 0 || (f.approved_previous || 0) === (f.work_previous || 0);
                      const newApprPrev = syncApprPrev ? v : (f.approved_previous || 0);
                      const newGrossAppr = newApprPrev + (f.approved_current || 0);
                      return {
                        ...f,
                        work_previous: v,
                        deductions_breakdown: recalcDeductions(f.deductions_breakdown || [], v + (f.work_current || 0)),
                        ...(syncApprPrev ? {
                          approved_previous: newApprPrev,
                          approved_deductions_breakdown: recalcDeductions(f.approved_deductions_breakdown || [], newGrossAppr),
                        } : {}),
                      };
                    })} />
                  <NumInput label="Current Work / حالي" value={form.work_current || 0}
                    onChange={(v) => setForm((f) => {
                      // Auto-sync to approved_current if it hasn't been manually changed
                      const syncApprCurr = (f.approved_current || 0) === 0 || (f.approved_current || 0) === (f.work_current || 0);
                      const newApprCurr = syncApprCurr ? v : (f.approved_current || 0);
                      const newGrossAppr = (f.approved_previous || 0) + newApprCurr;
                      return {
                        ...f,
                        work_current: v,
                        deductions_breakdown: recalcDeductions(f.deductions_breakdown || [], (f.work_previous || 0) + v),
                        ...(syncApprCurr ? {
                          approved_current: newApprCurr,
                          approved_deductions_breakdown: recalcDeductions(f.approved_deductions_breakdown || [], newGrossAppr),
                        } : {}),
                      };
                    })} />
                </div>

                {/* VOs */}
                {(form.variations || []).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Variation Orders / أوامر التغيير</label>
                    {(form.variations || []).map((vo, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                        <span className="text-[11px] font-mono text-purple-300 w-16 flex-shrink-0">{vo.vo_number}</span>
                        <span className="text-[11px] text-slate-400 flex-1 truncate">{vo.description}</span>
                        <input type="number" value={vo.amount}
                          onChange={(e) => updateVO("sub", i, "amount", parseFloat(e.target.value) || 0)}
                          className="w-32 px-2 py-1 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Fluctuation */}
                <NumInput label="Price Fluctuation / تقلبات الأسعار" value={form.fluctuation_amount || 0}
                  onChange={(v) => setForm((f) => {
                    const syncFluc = (f.approved_fluctuation_amount || 0) === 0 || (f.approved_fluctuation_amount || 0) === (f.fluctuation_amount || 0);
                    return {
                      ...f, fluctuation_amount: v,
                      ...(syncFluc ? { approved_fluctuation_amount: v } : {}),
                    };
                  })} />

                {/* Tax */}
                <div className="rounded-xl bg-slate-800/30 border border-white/[0.04] p-4">
                  <SectionHeader title="Tax / الضريبة" color="#f59e0b" />
                  <TaxSelector
                    taxType={form.tax_type || "none"}
                    taxDirection={form.tax_direction || "added"}
                    taxAmount={sub.taxAmt}
                    customPct={customTaxPct}
                    onTypeChange={(v) => handleTaxTypeChange(v, "sub")}
                    onDirectionChange={(v) => setForm((f) => ({ ...f, tax_direction: v }))}
                    onCustomPct={(v) => { setCustomTaxPct(v); setForm((f) => ({ ...f, tax_type: "custom", tax_amount: Math.round((v / 100) * sub.gross * 100) / 100 })); }}
                    gross={sub.gross}
                  />
                </div>

                {/* Deductions */}
                <div className="rounded-xl bg-slate-800/30 border border-white/[0.04] p-4">
                  <DeductionBuilder side="sub" grossBase={sub.grossForDeductions} />
                </div>

                {/* Net Summary */}
                <div className="rounded-xl border border-blue-500/20 p-4" style={{ background: "rgba(59,130,246,0.06)" }}>
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-3">Submitted Summary / ملخص المقدم</h4>
                  <NetSummaryRow label="Gross Work + VOs + Fluctuation" value={sub.gross} color="#3b82f6" />
                  {sub.dedTotal > 0 && <NetSummaryRow label={`Deductions (${(form.deductions_breakdown || []).length} items)`} value={-sub.dedTotal} color="#ef4444" />}
                  {sub.taxAmt !== 0 && (
                    <NetSummaryRow
                      label={`Tax (${form.tax_type}) ${form.tax_direction === "added" ? "+" : "-"}`}
                      value={form.tax_direction === "added" ? sub.taxAmt : -sub.taxAmt}
                      color="#f59e0b"
                    />
                  )}
                  <NetSummaryRow label="NET SUBMITTED / صافي المقدم" value={sub.net} color="#60a5fa" bold border />
                </div>
              </motion.div>
            )}

            {/* ── APPROVED SECTION ── */}
            {activeSection === "approved" && (
              <motion.div key="approved" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-green-500/20 p-5 space-y-5"
                style={{ background: "rgba(34,197,94,0.04)" }}>
                <SectionHeader title="✅ Client Approved / المعتمد من العميل" color="#22c55e" />

                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Approved Previous / سابق" value={form.approved_previous || 0}
                    onChange={(v) => setForm((f) => ({
                      ...f, approved_previous: v,
                      approved_deductions_breakdown: recalcDeductions(f.approved_deductions_breakdown || [], v + (f.approved_current || 0)),
                    }))} />
                  <NumInput label="Approved Current / حالي" value={form.approved_current || 0}
                    onChange={(v) => setForm((f) => ({
                      ...f, approved_current: v,
                      approved_deductions_breakdown: recalcDeductions(f.approved_deductions_breakdown || [], (f.approved_previous || 0) + v),
                    }))} />
                </div>

                {/* Approved VOs */}
                {(form.approved_variations || []).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Approved VOs / أوامر التغيير المعتمدة</label>
                    {(form.approved_variations || []).map((vo, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                        <span className="text-[11px] font-mono text-green-300 w-16 flex-shrink-0">{vo.vo_number}</span>
                        <span className="text-[11px] text-slate-400 flex-1 truncate">{vo.description}</span>
                        <input type="number" value={vo.amount}
                          onChange={(e) => updateVO("app", i, "amount", parseFloat(e.target.value) || 0)}
                          className="w-32 px-2 py-1 rounded-lg bg-slate-800 border border-white/5 text-xs text-white font-mono focus:outline-none" />
                      </div>
                    ))}
                  </div>
                )}

                <NumInput label="Approved Fluctuation" value={form.approved_fluctuation_amount || 0}
                  onChange={(v) => setForm((f) => ({ ...f, approved_fluctuation_amount: v }))} />

                <div className="rounded-xl bg-slate-800/30 border border-white/[0.04] p-4">
                  <SectionHeader title="Tax / الضريبة" color="#f59e0b" />
                  <TaxSelector
                    taxType={form.approved_tax_type || "none"}
                    taxDirection={form.approved_tax_direction || "added"}
                    taxAmount={appr.taxAmt}
                    customPct={customApprovedTaxPct}
                    onTypeChange={(v) => handleTaxTypeChange(v, "app")}
                    onDirectionChange={(v) => setForm((f) => ({ ...f, approved_tax_direction: v }))}
                    onCustomPct={(v) => { setCustomApprovedTaxPct(v); setForm((f) => ({ ...f, approved_tax_type: "custom", approved_tax_amount: Math.round((v / 100) * appr.gross * 100) / 100 })); }}
                    gross={appr.gross}
                  />
                </div>

                <div className="rounded-xl bg-slate-800/30 border border-white/[0.04] p-4">
                  <DeductionBuilder side="app" grossBase={appr.grossForDeductions} />
                </div>

                <div className="rounded-xl border border-green-500/20 p-4" style={{ background: "rgba(34,197,94,0.06)" }}>
                  <h4 className="text-[10px] font-bold text-green-400 uppercase mb-3">Approved Summary / ملخص المعتمد</h4>
                  <NetSummaryRow label="Gross Approved" value={appr.gross} color="#22c55e" />
                  {appr.dedTotal > 0 && <NetSummaryRow label={`Deductions (${(form.approved_deductions_breakdown || []).length} items)`} value={-appr.dedTotal} color="#ef4444" />}
                  {appr.taxAmt !== 0 && (
                    <NetSummaryRow
                      label={`Tax (${form.approved_tax_type}) ${form.approved_tax_direction === "added" ? "+" : "-"}`}
                      value={form.approved_tax_direction === "added" ? appr.taxAmt : -appr.taxAmt}
                      color="#f59e0b"
                    />
                  )}
                  <NetSummaryRow label="NET APPROVED / صافي المعتمد" value={appr.net} color="#4ade80" bold border />
                  {sub.net > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[10px]">
                      <span className="text-slate-500">Approval Gap</span>
                      <span style={{ color: sub.net - appr.net > 0 ? "#ef4444" : "#22c55e" }} className="font-mono font-bold">
                        {fmtFull(sub.net - appr.net)} ({sub.net > 0 ? ((( sub.net - appr.net) / sub.net * 100).toFixed(1)) : 0}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Approval Date */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Approval Date / تاريخ الاعتماد</label>
                  <input type="date" value={form.approval_date || ""}
                    onChange={(e) => setForm((f) => ({ ...f, approval_date: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none" />
                </div>
              </motion.div>
            )}

            {/* ── COLLECTIONS SECTION ── */}
            {activeSection === "collections" && (
              <motion.div key="collections" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-amber-500/20 p-5 space-y-5"
                style={{ background: "rgba(245,158,11,0.04)" }}>
                <SectionHeader title="💰 Collections / التحصيل" color="#f59e0b" />

                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Total Collected / المحصل" value={form.total_collections || 0}
                    onChange={(v) => setForm((f) => ({ ...f, total_collections: v }))} />
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Collection Date / تاريخ التحصيل</label>
                    <input type="date" value={form.collection_date || ""}
                      onChange={(e) => setForm((f) => ({ ...f, collection_date: e.target.value || null }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none" />
                  </div>
                  <NumInput label="Expected Collection / المتوقع" value={form.expected_collection || 0}
                    onChange={(v) => setForm((f) => ({ ...f, expected_collection: v }))} />
                  <NumInput label="Unbilled / غير مقدم" value={form.unbilled || 0}
                    onChange={(v) => setForm((f) => ({ ...f, unbilled: v }))} />
                </div>

                {/* Outstanding */}
                <div className="rounded-xl border border-amber-500/20 p-4" style={{ background: "rgba(245,158,11,0.06)" }}>
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase mb-3">Collections Summary / ملخص التحصيل</h4>
                  <NetSummaryRow label="Net Approved / صافي المعتمد" value={appr.net} color="#22c55e" />
                  <NetSummaryRow label="Total Collected / المحصل" value={form.total_collections || 0} color="#f59e0b" />
                  <NetSummaryRow
                    label="Outstanding / المتبقي"
                    value={appr.net - (form.total_collections || 0)}
                    color={appr.net - (form.total_collections || 0) > 0 ? "#ef4444" : "#22c55e"}
                    bold border
                  />
                  {appr.net > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Collection Efficiency</span>
                        <span className="text-white font-bold">
                          {((form.total_collections || 0) / appr.net * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((form.total_collections || 0) / appr.net * 100, 100)}%` }}
                          className="h-full rounded-full"
                          style={{ background: (form.total_collections || 0) / appr.net > 0.75 ? "#22c55e" : "#f59e0b" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STATUS SECTION ── */}
            {activeSection === "status" && (
              <motion.div key="status" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-purple-500/20 p-5 space-y-4"
                style={{ background: "rgba(168,85,247,0.04)" }}>
                <SectionHeader title="📋 Status & Notes / الحالة والملاحظات" color="#a855f7" />

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">IPC Status / حالة المستخلص</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "تحت الاعتماد", label: "Under Approval / تحت الاعتماد", color: "#f59e0b" },
                      { value: "معتمد", label: "Approved / معتمد", color: "#22c55e" },
                      { value: "جارى المراجعه للتقديم", label: "Under Review / جارى المراجعه", color: "#3b82f6" },
                      { value: "ختامى", label: "Final / ختامى", color: "#a855f7" },
                    ].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => {
                          // Intercept "Approved" click → ask user if same values or different
                          if (opt.value === "معتمد" && form.status !== "معتمد") {
                            setShowApprovalConfirm(true);
                          } else {
                            setForm((f) => ({ ...f, status: opt.value }));
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all"
                        style={form.status === opt.value
                          ? { borderColor: opt.color, background: `${opt.color}18`, color: opt.color }
                          : { borderColor: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: form.status === opt.value ? opt.color : "#334155" }} />
                        {opt.label}
                      </button>
                    ))}

                    {/* ── Approval Confirmation Dialog ── */}
                    <AnimatePresence>
                      {showApprovalConfirm && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          className="col-span-2 rounded-2xl border border-emerald-500/30 p-5 space-y-4 mt-1"
                          style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))" }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
                              <Check size={20} className="text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white mb-1">
                                Approval Confirmation — تأكيد الاعتماد
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                هل المستخلص المعتمد بنفس قيم المستخلص المقدم؟
                                <br />
                                Is the approved amount the same as the submitted amount?
                              </p>
                            </div>
                          </div>

                          {/* Summary of submitted values */}
                          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-3 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Submitted Previous</span>
                              <span className="text-white font-mono">{fmtFull(form.work_previous || 0)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Submitted Current</span>
                              <span className="text-white font-mono">{fmtFull(form.work_current || 0)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Fluctuation</span>
                              <span className="text-white font-mono">{fmtFull(form.fluctuation_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] border-t border-white/5 pt-1 mt-1">
                              <span className="text-slate-400 font-bold">Net Submitted</span>
                              <span className="text-blue-400 font-mono font-bold">{fmtFull(sub.net)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // YES — copy all submitted values to approved
                                setForm((f) => ({
                                  ...f,
                                  status: "معتمد",
                                  approval_date: f.approval_date || new Date().toISOString().slice(0, 10),
                                  approved_previous: f.work_previous || 0,
                                  approved_current: f.work_current || 0,
                                  approved_fluctuation_amount: f.fluctuation_amount || 0,
                                  approved_variations: (f.variations || []).map((vo) => ({ ...vo })),
                                  approved_deductions_breakdown: (f.deductions_breakdown || []).map((d) => ({ ...d })),
                                  approved_tax_type: f.tax_type || "none",
                                  approved_tax_amount: f.tax_amount || 0,
                                  approved_tax_direction: f.tax_direction || "added",
                                }));
                                setShowApprovalConfirm(false);
                              }}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                            >
                              ✅ Yes, Same Values — نعم، نفس القيم
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // NO — set status and navigate to Approved tab
                                setForm((f) => ({
                                  ...f,
                                  status: "معتمد",
                                  approval_date: f.approval_date || new Date().toISOString().slice(0, 10),
                                }));
                                setShowApprovalConfirm(false);
                                setActiveSection("approved");
                              }}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all"
                            >
                              ✏️ No, Update Values — لا، عدّل القيم
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowApprovalConfirm(false)}
                            className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 transition py-1"
                          >
                            Cancel — إلغاء
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Notes / ملاحظات</label>
                  <textarea value={form.approval_notes || ""} rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, approval_notes: e.target.value || null }))}
                    placeholder="Any notes about this IPC, approval conditions, outstanding items..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/5 text-sm text-white focus:outline-none resize-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Live Net Summary (always visible) ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Net Submitted", value: sub.net, color: "#60a5fa" },
              { label: "Net Approved", value: appr.net, color: "#4ade80" },
              { label: "Outstanding", value: appr.net - (form.total_collections || 0), color: appr.net - (form.total_collections || 0) > 0 ? "#f87171" : "#4ade80" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] p-3 text-center"
                style={{ background: `${item.color}08` }}>
                <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                <div className="text-base font-black font-mono" style={{ color: item.color }}>
                  {fmtFull(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fixed Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] flex-shrink-0 gap-3">
          <div className="text-[11px] text-slate-500">
            {!form.project_code && <span className="text-amber-400">⚠ Select a project to continue</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={handleSave}
              disabled={!form.project_code || create.isPending || update.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", boxShadow: "0 4px 20px #667eea33" }}>
              {create.isPending || update.isPending ? "Saving..." : invoice ? "Save Changes" : "Create IPC"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
