/**
 * Hook for managing all board share tokens — list, revoke, refresh.
 * Fetches from the `board_share_tokens` Supabase table.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildShareUrl, type BoardShareOptions } from "@/hooks/useIPC";
import { toast } from "sonner";

/* ─── Types ────────────────────────────────────────────── */

export type SharedLinkStatus = "active" | "expiring" | "expired" | "revoked";

export interface SharedLink {
  id: string;
  token: string;
  url: string;
  status: SharedLinkStatus;
  page: BoardShareOptions["page"];
  scope: Partial<BoardShareOptions> | null;
  invoiceCount: number;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  /** Human-readable relative time, e.g. "2 days ago" */
  createdAgo: string;
  /** Human-readable expiry, e.g. "in 5 days" or "expired" */
  expiresIn: string;
  /** Days until expiry (negative = expired) */
  daysUntilExpiry: number | null;
}

/* ─── Helpers ──────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function expiryText(expiresAt: string | null, isActive: boolean): string {
  if (!isActive) return "revoked";
  if (!expiresAt) return "no expiry";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return "expires tomorrow";
  if (days <= 7) return `expires in ${days}d`;
  if (days <= 30) return `expires in ${days}d`;
  return new Date(expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function computeStatus(isActive: boolean, expiresAt: string | null): SharedLinkStatus {
  if (!isActive) return "revoked";
  if (!expiresAt) return "active";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "expiring";
  return "active";
}

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function countInvoices(snapshotData: any): number {
  if (!snapshotData) return 0;
  if (Array.isArray(snapshotData)) return snapshotData.length;
  if (Array.isArray(snapshotData.invoices)) return snapshotData.invoices.length;
  return 0;
}

function extractPage(scope: any): BoardShareOptions["page"] {
  if (scope && typeof scope === "object" && scope.page) return scope.page;
  return "overview";
}

/* ─── Hook ─────────────────────────────────────────────── */

export function useSharedLinks() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["shared_links"],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SharedLink[]> => {
      const { data, error } = await (supabase as any)
        .from("board_share_tokens")
        .select("id, token, snapshot_data, scope, created_at, expires_at, is_active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        // Table may not exist yet
        if (/does not exist|schema cache|Could not find/i.test(error.message || "")) {
          return [];
        }
        throw error;
      }

      return (data || []).map((row: any) => {
        const status = computeStatus(row.is_active, row.expires_at);
        const page = extractPage(row.scope);
        return {
          id: row.id,
          token: row.token,
          url: buildShareUrl(row.token, page),
          status,
          page,
          scope: row.scope || null,
          invoiceCount: countInvoices(row.snapshot_data),
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          isActive: row.is_active,
          createdAgo: relativeTime(row.created_at),
          expiresIn: expiryText(row.expires_at, row.is_active),
          daysUntilExpiry: daysUntil(row.expires_at),
        } satisfies SharedLink;
      });
    },
  });

  const revokeToken = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase.rpc("revoke_board_token", { input_token: token });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared_links"] });
      // Also clear localStorage if the revoked token is the current one
      const currentToken = localStorage.getItem("pzone_ipc_share_token");
      toast.success("Link revoked — الرابط ألغي");
      // Don't auto-clear localStorage — user might be revoking a different token
    },
    onError: (e: any) => toast.error(`Revoke failed: ${e.message}`),
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      const activeLinks = (query.data || []).filter((l) => l.status === "active" || l.status === "expiring");
      for (const link of activeLinks) {
        await supabase.rpc("revoke_board_token", { input_token: link.token });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared_links"] });
      localStorage.removeItem("pzone_ipc_share_token");
      localStorage.removeItem("pzone_ipc_share_data");
      toast.success("All links revoked — جميع الروابط ألغيت");
    },
    onError: (e: any) => toast.error(`Revoke all failed: ${e.message}`),
  });

  const activeCount = (query.data || []).filter(
    (l) => l.status === "active" || l.status === "expiring",
  ).length;

  return {
    links: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    activeCount,
    revokeToken,
    revokeAll,
    refetch: query.refetch,
  };
}
