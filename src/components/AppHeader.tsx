import { Search, User, Menu, Sun, Moon } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Link } from "react-router-dom";

interface AppHeaderProps {
  sidebarWidth: number;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export default function AppHeader({ sidebarWidth, onMenuClick, isMobile }: AppHeaderProps) {
  const { theme, toggleTheme } = useThemeMode();
  const { data: profile } = useUserProfile();
  const { roles, user } = useUserRoles();
  const nextThemeLabel = theme === "dark" ? "Light" : "Dark";
  const displayName = profile?.full_name || user?.email || "User";
  const roleLabel = roles[0]?.replace(/_/g, " ") || profile?.department || "User";

  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 transition-all duration-300 bg-background/80 border-b border-border/40 backdrop-blur-md"
      style={{ left: isMobile ? 0 : sidebarWidth }}
    >
      {/* Left side: Menu and Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        {isMobile && (
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-md hover:bg-muted text-foreground"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 w-full max-w-xs transition-all bg-muted border border-border">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects, tenders, invoices..."
            className="bg-transparent border-none outline-none text-sm w-full font-body text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${nextThemeLabel} Mode`}
          aria-pressed={theme === "dark"}
          className="p-2 rounded-lg hover:bg-muted text-foreground transition-all duration-300 border border-border/40 flex items-center justify-center"
          title={`Switch to ${nextThemeLabel} Mode`}
        >
          {theme === "dark" ? (
            <Sun size={16} className="text-[#c5a880] animate-pulse" />
          ) : (
            <Moon size={16} className="text-[#a3845b]" />
          )}
        </button>

        <NotificationBell />
        <div className="h-6 w-px bg-border" />
        <Link to="/settings" className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
            <User size={14} className="text-primary-foreground" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium font-heading text-foreground">{displayName}</p>
            <p className="text-xs capitalize text-muted-foreground">{roleLabel}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
