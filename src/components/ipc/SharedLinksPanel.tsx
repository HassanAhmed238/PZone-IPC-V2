/**
 * SharedLinksPanel — View, test, and revoke all shared board links.
 * Premium-styled modal with status indicators, scope summaries, and actions.
 */
import { useState, useCallback } from "react";
import {
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Link2Off,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
  Check,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useSharedLinks, type SharedLink, type SharedLinkStatus } from "@/hooks/useSharedLinks";
import { toast } from "sonner";

/* ─── Status Badge ───────────────────────────────────── */

const STATUS_CONFIG: Record<SharedLinkStatus, { color: string; bg: string; border: string; label: string; labelAr: string; icon: typeof Globe }> = {
  active: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", label: "Active", labelAr: "نشط", icon: Globe },
  expiring: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", label: "Expiring", labelAr: "ينتهي قريباً", icon: Clock },
  expired: { color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.25)", label: "Expired", labelAr: "منتهي", icon: AlertTriangle },
  revoked: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "Revoked", labelAr: "ملغي", icon: Link2Off },
};

function StatusBadge({ status }: { status: SharedLinkStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={10} />
      {cfg.label}
    </div>
  );
}

/* ─── Scope Summary ──────────────────────────────────── */

function ScopeSummary({ link }: { link: SharedLink }) {
  const parts: string[] = [];
  if (link.scope?.projectCodes?.length) parts.push(`${link.scope.projectCodes.length} projects`);
  if (link.scope?.clients?.length) parts.push(`${link.scope.clients.length} clients`);
  if (link.scope?.months?.length) parts.push(`${link.scope.months.length} months`);
  if (link.scope?.statuses?.length) parts.push(link.scope.statuses.join(", "));
  const scopeStr = parts.length > 0 ? parts.join(" · ") : "All data";
  return (
    <span className="text-[10px] text-zinc-500">{scopeStr} · {link.invoiceCount} IPCs</span>
  );
}

/* ─── Link Row ───────────────────────────────────────── */

function LinkRow({
  link,
  onRevoke,
  isRevoking,
}: {
  link: SharedLink;
  onRevoke: (token: string) => void;
  isRevoking: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success("Link copied — تم النسخ");
    setTimeout(() => setCopied(false), 2000);
  }, [link.url]);

  const handleOpen = useCallback(() => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  }, [link.url]);

  const handleRevoke = useCallback(() => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    onRevoke(link.token);
    setShowConfirm(false);
  }, [showConfirm, onRevoke, link.token]);

  const isLive = link.status === "active" || link.status === "expiring";
  const pageLabel = { overview: "Overview", projects: "Projects", clients: "Clients", status: "Status" }[link.page || "overview"] || "Overview";

  return (
    <div
      className="group rounded-xl border bg-background/40 px-4 py-3.5 transition-all hover:bg-muted/20"
      style={{
        borderColor: isLive ? "rgba(197,168,128,0.15)" : "rgba(113,113,122,0.12)",
      }}
    >
      {/* Top row: status + page + created */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <StatusBadge status={link.status} />
          <span className="rounded-md border border-[#c5a880]/20 bg-[#c5a880]/5 px-2 py-0.5 text-[10px] font-bold text-[#c5a880]">
            {pageLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">{link.createdAgo}</span>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 mb-2">
        <Link2 size={12} className={isLive ? "text-[#c5a880]" : "text-zinc-600"} />
        <span className="flex-1 truncate font-mono text-[11px] text-zinc-300">
          {link.url.replace(/^https?:\/\//, "")}
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">
          {link.token.slice(0, 8)}…
        </span>
      </div>

      {/* Scope + expiry info */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <ScopeSummary link={link} />
        <span
          className="text-[10px] font-medium"
          style={{ color: STATUS_CONFIG[link.status].color }}
        >
          {link.expiresIn}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition hover:bg-muted/30 hover:text-zinc-200"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition hover:bg-muted/30 hover:text-zinc-200"
        >
          <ExternalLink size={11} />
          {isLive ? "Test" : "Open"}
        </button>
        {isLive && (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isRevoking}
            className={`ml-auto flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
              showConfirm
                ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-border/50 text-zinc-500 hover:border-red-500/30 hover:text-red-400"
            }`}
          >
            {isRevoking ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Trash2 size={11} />
            )}
            {showConfirm ? "Confirm Revoke?" : "Revoke"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────── */

interface SharedLinksPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SharedLinksPanel({ open, onClose }: SharedLinksPanelProps) {
  const { links, isLoading, activeCount, revokeToken, revokeAll, refetch } = useSharedLinks();
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);

  const handleRevokeAll = useCallback(() => {
    if (!showRevokeAllConfirm) {
      setShowRevokeAllConfirm(true);
      return;
    }
    revokeAll.mutate();
    setShowRevokeAllConfirm(false);
  }, [showRevokeAllConfirm, revokeAll]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[#c5a880]/15 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c5a880]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #c5a880, #dfc9ab)" }}
            >
              <Link2 size={16} className="text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground">Shared Links</h2>
              <p className="text-[10px] text-muted-foreground">
                الروابط المشاركة — {activeCount} active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Refresh list"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#c5a880]" />
            </div>
          )}

          {!isLoading && links.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(197,168,128,0.08)", border: "1px solid rgba(197,168,128,0.15)" }}
              >
                <Link2Off size={24} className="text-zinc-500" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">No shared links yet</h3>
              <p className="text-[11px] text-muted-foreground max-w-[250px]">
                Generate a share link from the IPC Board to share data with board members.
              </p>
            </div>
          )}

          {!isLoading && links.length > 0 && (
            <>
              {links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onRevoke={(token) => revokeToken.mutate(token)}
                  isRevoking={revokeToken.isPending}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && links.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#c5a880]/10 px-6 py-3.5">
            <span className="text-[10px] text-muted-foreground">
              {links.length} total · {activeCount} active · {links.length - activeCount} inactive
            </span>
            {activeCount > 1 && (
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revokeAll.isPending}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition ${
                  showRevokeAllConfirm
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400"
                }`}
              >
                {revokeAll.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <ShieldAlert size={11} />
                )}
                {showRevokeAllConfirm ? "Confirm Revoke All?" : "Revoke All"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
