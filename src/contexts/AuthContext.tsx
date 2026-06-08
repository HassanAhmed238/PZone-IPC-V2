/* ─── Legacy AuthContext ───────────────────────────────────
   Re-exports from the Zustand store for backward compatibility.
   All consumers can keep their existing imports.
   ──────────────────────────────────────────────────────── */

export { useAuth } from "@/stores/useAuthStore";

/**
 * @deprecated AuthProvider is no longer needed. The Zustand store
 * manages auth state globally. This is a pass-through wrapper
 * kept only for backward compatibility in App.tsx.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
