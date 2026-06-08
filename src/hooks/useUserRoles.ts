import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// BUG-11 fix: Admin emails from env variable (comma-separated)
// In production builds, VITE_ADMIN_EMAILS MUST be set — no hardcoded fallback.
const ADMIN_EMAILS = (
  import.meta.env.VITE_ADMIN_EMAILS ||
  (import.meta.env.DEV ? "solimane@pzone.com,admin@pzone.com" : "")
)
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

const IS_DEV_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_BYPASS === "true";

export function useUserRoles() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    enabled: !!user,
  });

  const isAdminEmail = ADMIN_EMAILS.includes(user?.email?.toLowerCase() || "");
  const hasRole = (role: string) => {
    if (isAdminEmail || IS_DEV_BYPASS) return true;
    return roles.includes(role as any);
  };
  const isAdmin = isAdminEmail || IS_DEV_BYPASS || hasRole("admin");

  return { roles, isLoading, hasRole, isAdmin, user };
}
