import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, User, Menu, Sun, Moon, Check, Palette } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useThemeMode, type ThemeMode } from "@/hooks/useThemeMode";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Link } from "react-router-dom";

interface AppHeaderProps {
  sidebarWidth: number;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

/* ── Theme definitions for the header dropdown ── */
const THEME_OPTIONS: { mode: ThemeMode; label: string; dot: string; darkBg: boolean }[] = [
  { mode: "light",     label: "Light",      dot: "#f8fafc",  darkBg: false },
  { mode: "baby-blue", label: "Baby Blue",  dot: "#eff6ff",  darkBg: false },
  { mode: "grey",      label: "Grey",       dot: "#e2e8f0",  darkBg: false },
  { mode: "dark",      label: "Dark",       dot: "#0f172a",  darkBg: true },
  { mode: "dark-grey", label: "Dark Grey",  dot: "#1a1a2e",  darkBg: true },
  { mode: "golden",    label: "Golden",     dot: "#c5a880",  darkBg: true },
  { mode: "pzone",     label: "P.ZONE",     dot: "linear-gradient(135deg, #0d9488, #7c3aed, #db2777)", darkBg: true },
];

function HeaderThemeSwitcher({ theme, setTheme }: { theme: ThemeMode; setTheme: (m: ThemeMode) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const current = THEME_OPTIONS.find(t => t.mode === theme) ?? THEME_OPTIONS[0];
  const isDark = current.darkBg;

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.max(rect.right - 200, 8) });
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-muted text-foreground transition-all duration-300 border border-border/40 flex items-center justify-center gap-1.5"
        title={`Theme: ${current.label}`}
        aria-label="Change theme"
      >
        <Palette size={16} className="text-[#c5a880]" />
        <span className="hidden md:inline text-xs font-medium text-muted-foreground">{current.label}</span>
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-48 overflow-hidden rounded-xl border shadow-2xl"
            style={{
              top: pos.top,
              left: pos.left,
              background: "var(--background, #ffffff)",
              borderColor: "var(--border, #e2e8f0)",
            }}
          >
            <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
              Select Theme
            </div>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => { setTheme(opt.mode); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-all hover:bg-muted/60"
                style={{
                  color: theme === opt.mode ? "hsl(var(--primary))" : "var(--foreground)",
                  background: theme === opt.mode ? "hsl(var(--primary) / 0.08)" : "transparent",
                }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full shrink-0"
                  style={{
                    background: opt.dot,
                    border: `2px solid ${theme === opt.mode ? "hsl(var(--primary))" : "var(--border, #cbd5e1)"}`,
                  }}
                />
                {opt.label}
                {theme === opt.mode && <Check size={12} className="ml-auto opacity-70" />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

export default function AppHeader({ sidebarWidth, onMenuClick, isMobile }: AppHeaderProps) {
  const { theme, setTheme } = useThemeMode();
  const { data: profile } = useUserProfile();
  const { roles, user } = useUserRoles();
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
        {/* Theme Switcher Dropdown */}
        <HeaderThemeSwitcher theme={theme} setTheme={setTheme} />

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
