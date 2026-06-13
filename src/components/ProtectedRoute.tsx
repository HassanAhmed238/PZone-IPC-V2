import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/stores/useAuthStore";
import { useRouteAccess } from "@/hooks/useRouteAccess";

// ── Dev bypass: only active when BOTH Vite dev-mode AND env flag are set ──
const IS_DEV_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_BYPASS === "true";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { canAccess, isLoading: rolesLoading } = useRouteAccess();
  const location = useLocation();

  // Allow everything only in explicit dev bypass mode
  if (IS_DEV_BYPASS) return <>{children}</>;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" replace />;

  // Show loading while checking roles
  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check route access
  if (!canAccess(location.pathname)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}

