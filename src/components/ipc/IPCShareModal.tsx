import { useState, useMemo, useCallback } from "react";
import {
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { type Invoice, useInvoices, useGenerateShareToken, buildShareUrl, getCurrentShareToken, type BoardShareOptions } from "@/hooks/useIPC";
import { toast } from "sonner";

/* ─── Scope Config Panel ─────────────────────────── */

interface ScopeState {
  page: BoardShareOptions["page"];
  projectCodes: string[];
  clients: string[];
  statuses: string[];
  months: string[];
  projectManagers: string[];
  includeCharts: boolean;
  includeTables: boolean;
  expiryDays: number;
}

const DEFAULT_SCOPE: ScopeState = {
  page: "overview",
  projectCodes: [],
  clients: [],
  statuses: [],
  months: [],
  projectManagers: [],
  includeCharts: true,
  includeTables: true,
  expiryDays: 90,
};

const PAGES: { value: NonNullable<BoardShareOptions["page"]>; label: string; labelAr: string }[] = [
  { value: "overview", label: "Executive Overview", labelAr: "النظرة التنفيذية" },
  { value: "projects", label: "Project Detail", labelAr: "تفاصيل المشاريع" },
  { value: "clients", label: "Client Summary", labelAr: "ملخص العملاء" },
  { value: "status", label: "Status Board", labelAr: "لوحة الحالة" },
];

const EXPIRY_OPTIONS = [
  { days: 7, label: "1 week" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];

/* ─── Multi-Select Chip Component ───────────────── */

function ChipSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-bold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
              }
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                active
                  ? "border-[#c5a880]/60 bg-[#c5a880]/15 text-[#c5a880]"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Toggle Switch Component ────────────────────── */

function ToggleRow({
  label,
  labelAr,
  checked,
  onChange,
}: {
  label: string;
  labelAr?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left transition hover:bg-muted/30"
    >
      <div>
        <span className="text-xs font-bold">{label}</span>
        {labelAr && <span className="ml-2 text-[10px] text-muted-foreground">/ {labelAr}</span>}
      </div>
      <div
        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
          checked ? "bg-[#c5a880]" : "bg-muted"
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

/* ─── Main Share Modal ───────────────────────────── */

interface IPCShareModalProps {
  open: boolean;
  onClose: () => void;
  projectManagerByCode?: Record<string, string | null | undefined>;
}

export function IPCShareModal({ open, onClose, projectManagerByCode }: IPCShareModalProps) {
  const { data: invoices = [] } = useInvoices();
  const generateToken = useGenerateShareToken();
  const [scope, setScope] = useState<ScopeState>(DEFAULT_SCOPE);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const existingToken = getCurrentShareToken();

  // Extract unique filter values from invoices
  const uniqueProjects = useMemo(
    () => [...new Set(invoices.map((i: Invoice) => i.project_code))].sort(),
    [invoices],
  );
  const uniqueClients = useMemo(
    () => [...new Set(invoices.map((i: Invoice) => (i.client || "Unknown").trim()))].sort(),
    [invoices],
  );
  const uniqueStatuses = useMemo(
    () => [...new Set(invoices.map((i: Invoice) => i.status || "Unknown"))].sort(),
    [invoices],
  );
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    invoices.forEach((i: Invoice) => {
      const d = i.submitted_date || i.approval_date;
      if (d) months.add(d.slice(0, 7));
    });
    return [...months].sort().reverse();
  }, [invoices]);
  const uniqueManagers = useMemo(() => {
    if (!projectManagerByCode) return [];
    return [...new Set(Object.values(projectManagerByCode).filter(Boolean) as string[])].sort();
  }, [projectManagerByCode]);

  // Count filtered invoices
  const filteredCount = useMemo(() => {
    return invoices.filter((inv: Invoice) => {
      if (scope.projectCodes.length && !scope.projectCodes.includes(inv.project_code)) return false;
      if (scope.clients.length && !scope.clients.includes((inv.client || "Unknown").trim())) return false;
      if (scope.statuses.length && !scope.statuses.includes(inv.status || "Unknown")) return false;
      if (scope.months.length) {
        const m = (inv.submitted_date || inv.approval_date || "").slice(0, 7);
        if (!m || !scope.months.includes(m)) return false;
      }
      if (scope.projectManagers.length && projectManagerByCode) {
        const pm = projectManagerByCode[inv.project_code] || "Unassigned";
        if (!scope.projectManagers.includes(pm)) return false;
      }
      return true;
    }).length;
  }, [invoices, scope, projectManagerByCode]);

  const handleGenerate = useCallback(async () => {
    const expiresAt = new Date(Date.now() + scope.expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await generateToken.mutateAsync({
      options: {
        page: scope.page,
        projectCodes: scope.projectCodes.length ? scope.projectCodes : undefined,
        clients: scope.clients.length ? scope.clients : undefined,
        statuses: scope.statuses.length ? scope.statuses : undefined,
        months: scope.months.length ? scope.months : undefined,
        projectManagers: scope.projectManagers.length ? scope.projectManagers : undefined,
        projectManagerByCode,
        includeCharts: scope.includeCharts,
        includeTables: scope.includeTables,
        expiresAt,
      },
    });
    if (result?.token) {
      setGeneratedUrl(buildShareUrl(result.token, scope.page));
    }
  }, [scope, generateToken, projectManagerByCode]);

  const handleRevoke = useCallback(async () => {
    await generateToken.mutateAsync({ revoke: true });
    setGeneratedUrl(null);
    toast.success("Share link revoked — الرابط ألغي");
  }, [generateToken]);

  const handleCopy = useCallback(() => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast.success("Copied to clipboard — تم النسخ");
    }
  }, [generatedUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c5a880]/15 text-[#c5a880]">
              <Share2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black">Share Board Online</h2>
              <p className="text-[11px] text-muted-foreground">مشاركة اللوحة أونلاين</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Page / Tab selector */}
          <div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">Page / Tab</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PAGES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setScope((s) => ({ ...s, page: p.value }))}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    scope.page === p.value
                      ? "border-[#c5a880]/60 bg-[#c5a880]/10 font-black text-[#c5a880]"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="mt-0.5 text-[10px] opacity-70">{p.labelAr}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope filters */}
          <ChipSelect
            label="Projects / مشاريع"
            options={uniqueProjects}
            selected={scope.projectCodes}
            onChange={(v) => setScope((s) => ({ ...s, projectCodes: v }))}
          />
          <ChipSelect
            label="Clients / عملاء"
            options={uniqueClients}
            selected={scope.clients}
            onChange={(v) => setScope((s) => ({ ...s, clients: v }))}
          />
          <ChipSelect
            label="Status / الحالة"
            options={uniqueStatuses}
            selected={scope.statuses}
            onChange={(v) => setScope((s) => ({ ...s, statuses: v }))}
          />
          <ChipSelect
            label="Months / الأشهر"
            options={uniqueMonths}
            selected={scope.months}
            onChange={(v) => setScope((s) => ({ ...s, months: v }))}
          />
          {uniqueManagers.length > 0 && (
            <ChipSelect
              label="Project Managers / مديرو المشاريع"
              options={uniqueManagers}
              selected={scope.projectManagers}
              onChange={(v) => setScope((s) => ({ ...s, projectManagers: v }))}
            />
          )}

          {/* Toggles */}
          <div className="space-y-2">
            <ToggleRow
              label="Include Charts"
              labelAr="رسوم بيانية"
              checked={scope.includeCharts}
              onChange={(v) => setScope((s) => ({ ...s, includeCharts: v }))}
            />
            <ToggleRow
              label="Include Tables"
              labelAr="جداول"
              checked={scope.includeTables}
              onChange={(v) => setScope((s) => ({ ...s, includeTables: v }))}
            />
          </div>

          {/* Expiry selector */}
          <div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">Expiry / الصلاحية</div>
            <div className="flex flex-wrap gap-1.5">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setScope((s) => ({ ...s, expiryDays: opt.days }))}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    scope.expiryDays === opt.days
                      ? "border-[#c5a880]/60 bg-[#c5a880]/15 text-[#c5a880]"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scope summary */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {scope.projectCodes.length || scope.clients.length || scope.statuses.length || scope.months.length
                  ? `${filteredCount} invoices in scope`
                  : `All ${invoices.length} invoices`}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Lock size={11} />
                <span>Read-only, scoped, {scope.expiryDays}d expiry</span>
              </span>
            </div>
          </div>

          {/* Generated URL */}
          {generatedUrl && (
            <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                <Globe size={14} />
                Board link generated
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                <input
                  readOnly
                  value={generatedUrl}
                  className="min-w-0 flex-1 bg-transparent text-xs font-mono text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy size={14} />
                </button>
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {/* Existing token revoke */}
          {existingToken && (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={generateToken.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 size={13} />
              Revoke existing share link
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateToken.isPending || filteredCount === 0}
            className="flex items-center gap-2 rounded-lg bg-[#c5a880] px-5 py-2 text-xs font-black text-white shadow-lg transition hover:bg-[#b8976d] disabled:opacity-50"
          >
            {generateToken.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Share2 size={14} />
                Generate Link ({filteredCount})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
