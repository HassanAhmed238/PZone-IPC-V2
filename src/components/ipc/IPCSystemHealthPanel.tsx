import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Database, FileCode, ShieldAlert, Wifi } from "lucide-react";
import { useIPCSystemHealth } from "@/hooks/useIPCSystemHealth";

function statusClass(status: string) {
  if (status === "ok") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-red-500/25 bg-red-500/10 text-red-300";
}

function overallStateLabel(data: { ready: boolean; blockingCount: number; warningCount: number }) {
  if (data.ready && data.warningCount === 0) return { text: "Ready", textAr: "جاهز", color: "text-emerald-400" };
  if (data.ready && data.warningCount > 0) return { text: "Partial", textAr: "جزئي", color: "text-amber-400" };
  if (data.blockingCount <= 2) return { text: "Needs SQL", textAr: "يحتاج SQL", color: "text-amber-400" };
  return { text: "Broken", textAr: "معطل", color: "text-red-400" };
}

export function IPCSystemHealthPanel({ isAdmin }: { isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useIPCSystemHealth(isAdmin);

  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Checking IPC online readiness...
      </div>
    );
  }

  if (!data) return null;

  const Icon = data.ready ? CheckCircle2 : ShieldAlert;
  const state = overallStateLabel(data);
  const needsAttention = data.blockingCount > 0 || data.warningCount > 0;
  const failedChecks = data.checks.filter((check) => check.status !== "ok");
  const requiredChecks = data.checks.filter((check) => check.required);
  const passedRequired = requiredChecks.filter((check) => check.status === "ok").length;
  const shareReady =
    data.checks.find((check) => check.key === "board_share_tokens")?.status === "ok" &&
    data.checks.find((check) => check.key === "get_board_snapshot_rpc")?.status === "ok" &&
    data.checks.find((check) => check.key === "create_board_token_rpc")?.status === "ok";

  return (
    <section className="mb-5 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${state.color}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black">IPC System Health / جاهزية نظام المستخلصات</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(data.ready ? "ok" : "warning")}`}>
                {data.score}/100
              </span>
              <span className={`rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-black ${state.color}`}>
                {state.text} / {state.textAr}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.ready
                ? "Supabase control layer is ready for online dashboards and sharing."
                : `${data.blockingCount} blocking issue(s), ${data.warningCount} warning(s). Fix before relying on board links.`}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {(expanded || needsAttention) && (
        <div className="border-t border-border px-4 py-4">
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Database size={13} /> Required SQL
              </div>
              <div className="text-lg font-black">{passedRequired}/{requiredChecks.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Wifi size={13} /> Online Share
              </div>
              <div className="text-lg font-black">{shareReady ? "Ready" : "Blocked"}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <AlertTriangle size={13} /> Local Residue
              </div>
              <div className="text-lg font-black">{data.localInvoiceCount + data.localProjectCount}</div>
            </div>
          </div>

          {failedChecks.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-300">
                <FileCode size={13} /> Migrations to run in Supabase SQL Editor
              </div>
              <div className="space-y-1.5">
                {failedChecks.map((check) => (
                  <div key={check.key} className="flex items-start gap-2 text-[11px]">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${check.status === "error" ? "bg-red-400" : "bg-amber-400"}`} />
                    <div className="min-w-0 break-words">
                      <span className="font-bold">{check.label}</span>
                      <span className="ml-1 text-muted-foreground">{check.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {data.checks.map((check) => (
              <div key={check.key} className={`rounded-lg border px-3 py-2 ${statusClass(check.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black">{check.label}</div>
                    <div className="text-[11px] opacity-80">{check.labelAr}</div>
                  </div>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                    {check.status}
                  </span>
                </div>
              {check.status !== "ok" && <p className="mt-2 break-words text-[11px] leading-relaxed opacity-90">{check.detail}</p>}
            </div>
          ))}
          </div>
        </div>
      )}
    </section>
  );
}
