import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Wallet,
  ChevronLeft,
  Settings,
  Database,
  Menu,
  Shield,
  ScanFace,
  ClipboardCheck,
  Users2,
} from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useModuleAccess } from "@/hooks/useModuleAccess";

// Hardcoded fallback in case DB is empty or still loading
const fallbackModuleAccess: Record<string, string[]> = {
  "/": ["all"],
  "/settings": ["all"],
  "/projects": ["project_manager", "ceo", "chairman"],
  "/ipc-management": ["finance", "cost_control", "contract_admin", "ipc_clerk", "ceo", "chairman"],
  "/collections": ["finance", "ceo", "chairman"],
  "/cash-flow": ["finance", "cost_control", "ceo", "chairman"],
  "/executive": ["ceo", "chairman", "finance"],
  "/stakeholders": ["project_manager", "contract_admin"],
  "/user-management": ["admin"],
};

const MODULES = [
  { icon: FolderKanban, label: "Project Setup", path: "/projects", badge: null },
  { icon: ClipboardCheck, label: "IPC Management", path: "/ipc-management", badge: null },
  { icon: Wallet, label: "Collections", path: "/collections", badge: null },
  { icon: Users2, label: "Stakeholders", path: "/stakeholders", badge: null },
];

const ADMIN_MODULES = [
  { icon: Shield, label: "User & RACI Admin", path: "/user-management", badge: "ADMIN" },
  { icon: Database, label: "Master Data", path: "/master-data", badge: null },
  { icon: ScanFace, label: "Folio OCR", path: "/ocr-workspace", badge: null },
];


interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileMenuOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export default function AppSidebar({ collapsed, onToggle, mobileMenuOpen, onMobileClose, isMobile }: AppSidebarProps) {
  const location = useLocation();
  const { roles, isAdmin } = useUserRoles();
  const { data: dbAccessRoles } = useModuleAccess();

  // Filter modules based on user roles
  const allModules = isAdmin ? [...MODULES, ...ADMIN_MODULES] : MODULES;

  const visibleModules = allModules.filter((mod) => {
    // If Admin, see everything
    if (isAdmin) return true;

    // Default to fallback if no DB rules exist for this path yet
    let allowedRoles = fallbackModuleAccess[mod.path] || [];

    // If DB is loaded, find roles associated with this path
    if (dbAccessRoles) {
      const match = dbAccessRoles.find((r) => r.module_path === mod.path);
      if (match && match.allowed_roles) {
        allowedRoles = match.allowed_roles;
      }
    }

    if (allowedRoles.includes("all")) return true;
    
    // Check if user has at least one of the allowed roles
    return allowedRoles.some((role) => roles.includes(role as any));
  });

  // Mobile sidebar logic
  const isMobileView = isMobile || false;
  const isMenuOpen = mobileMenuOpen || false;

  const getSidebarWidth = () => {
    if (isMobileView) return 260; // Always full width on mobile
    return collapsed ? 72 : 260;
  };

  const xPosition = isMobileView && !isMenuOpen ? -260 : 0;

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: getSidebarWidth(),
        x: xPosition
      }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={`fixed left-0 top-0 z-40 h-screen flex flex-col ${isMobileView && !isMenuOpen ? 'pointer-events-none' : ''}`}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.img
              key="logo"
              src={logoWhite}
              alt="P.ZONE"
              className="h-8 w-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="ml-auto text-sidebar-foreground hover:text-sidebar-primary-foreground transition-colors p-1.5 rounded-md hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleModules.map((mod) => {
          const isActive = location.pathname === mod.path;
          return (
            <NavLink
              key={mod.path}
              to={mod.path}
              onClick={onMobileClose}
              title={collapsed ? mod.label : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                ${isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/50"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <mod.icon size={18} className={isActive ? "text-sidebar-primary" : ""} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {mod.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {mod.badge && !collapsed && (
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                  mod.badge === "!" ? "bg-brand-orange text-accent-foreground" : "bg-sidebar-primary text-sidebar-primary-foreground"
                }`}>
                  {mod.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <NavLink to="/settings" onClick={onMobileClose} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </motion.aside>
  );
}
