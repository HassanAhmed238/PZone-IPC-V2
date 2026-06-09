import { useUserRoles } from "./useUserRoles";

// Define which roles can access each route
const routeAccess: Record<string, string[]> = {
  "/": ["all"],
  "/tenders": ["all"],
  "/tenders/new": ["admin", "estimator", "ceo"],
  "/budget": ["admin", "cost_control", "estimator", "finance", "ceo", "chairman"],
  "/projects": ["admin", "project_manager", "ceo", "chairman"],
  "/collections": ["admin", "finance", "ceo", "chairman"],
  "/payments": ["admin", "finance", "ceo", "chairman"],
  "/cash-flow": ["admin", "finance", "ceo", "chairman"],
  "/executive": ["admin", "ceo", "chairman"],
  "/master-data": ["admin"],
  "/user-management": ["admin", "ceo", "chairman"],
  "/ipc-management": ["all"],
  "/invoices": ["all"],
  "/ongoing-projects": ["all"],
  "/stakeholders": ["all"],
  "/ocr-workspace": ["all"],
  "/python-console": ["admin"],
  "/board-dashboard": ["admin", "ceo", "chairman"],
};

export function useRouteAccess() {
  const { roles, isAdmin, isLoading } = useUserRoles();

  const canAccess = (path: string): boolean => {
    // Admin always has full access — check this first, before anything else
    if (isAdmin) return true;

    // Check exact match first
    let allowedRoles = routeAccess[path];
    
    // If no exact match, check for dynamic routes (wildcards)
    if (!allowedRoles) {
      if (path.startsWith("/tenders/") && path !== "/tenders/new") {
        allowedRoles = ["all"];
      } else if (path.startsWith("/budget/")) {
        allowedRoles = ["admin", "cost_control", "estimator", "finance", "ceo", "chairman"];
      } else if (path.startsWith("/projects/")) {
        allowedRoles = ["admin", "project_manager", "ceo", "chairman"];
      } else if (path.startsWith("/ipc-board/")) {
        allowedRoles = ["all"];
      }
    }

    // Default: if route not in the access map, allow access (don't block unlisted pages)
    if (!allowedRoles) return true;
    
    // "all" means everyone can access
    if (allowedRoles.includes("all")) return true;
    
    // Check if user has any of the allowed roles
    return allowedRoles.some((role) => roles.includes(role as any));
  };

  return { canAccess, isLoading };
}
