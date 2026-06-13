import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Gauge,
  Percent,
  RotateCcw,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { fmtCompact, fmtNum, fmtPercent } from "@/lib/utils";
import { type Invoice, useIPCBoardSnapshot } from "@/hooks/useIPC";
import { computeFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useMonthlyOverrides } from "@/hooks/useMonthlyOverrides";

/* ═══════════════════════════════════════════════════════
   Theme System — 7 Premium Modes
   ═══════════════════════════════════════════════════════ */

type BoardThemeMode = "light" | "grey" | "dark" | "dark-grey" | "baby-blue" | "golden" | "pzone";

interface BoardThemeColors {
  pageBg: string;
  pageGradient: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardHoverBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headerBg: string;
  headerText: string;
  headerSubtext: string;
  headerAccent: string;
  footerBg: string;
  navBg: string;
  navBorder: string;
  navPillBg: string;
  navPillBorder: string;
  navPillText: string;
  slicerBg: string;
  slicerBorder: string;
  selectBg: string;
  selectBorder: string;
  selectText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tableBorder: string;
  tableHeaderBg: string;
  tableRowHover: string;
  gridStroke: string;
  axisTick: string;
  dividerColor: string;
  logoSrc: string;
  logoFooterSrc: string;
  logoFilter: string;
}

const THEMES: Record<BoardThemeMode, { label: string; icon: "sun" | "moon"; colors: BoardThemeColors }> = {
  light: {
    label: "Light",
    icon: "sun",
    colors: {
      pageBg: "#f8fafc",
      pageGradient: "radial-gradient(ellipse at top, #f1f5f9, #f8fafc 40%, #f8fafc)",
      cardBg: "#ffffff",
      cardBorder: "rgba(0,0,0,0.06)",
      cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
      cardHoverBg: "#f8fafc",
      textPrimary: "#0f172a",
      textSecondary: "#64748b",
      textMuted: "#94a3b8",
      headerBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
      headerText: "#ffffff",
      headerSubtext: "rgba(147,197,253,0.7)",
      headerAccent: "rgba(147,197,253,0.4)",
      footerBg: "linear-gradient(135deg, #0f172a, #1e293b)",
      navBg: "rgba(255,255,255,0.9)",
      navBorder: "rgba(226,232,240,0.8)",
      navPillBg: "#ffffff",
      navPillBorder: "#e2e8f0",
      navPillText: "#64748b",
      slicerBg: "#f8fafc",
      slicerBorder: "#e2e8f0",
      selectBg: "#ffffff",
      selectBorder: "#cbd5e1",
      selectText: "#1e293b",
      tooltipBg: "#ffffff",
      tooltipBorder: "#e2e8f0",
      tooltipText: "#334155",
      tableBorder: "#f1f5f9",
      tableHeaderBg: "#f8fafc",
      tableRowHover: "rgba(248,250,252,0.8)",
      gridStroke: "#e2e8f0",
      axisTick: "#64748b",
      dividerColor: "rgba(255,255,255,0.06)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
  grey: {
    label: "Grey",
    icon: "moon",
    colors: {
      pageBg: "#e2e8f0",
      pageGradient: "radial-gradient(ellipse at top, #cbd5e1, #e2e8f0 40%, #e2e8f0)",
      cardBg: "#f1f5f9",
      cardBorder: "rgba(0,0,0,0.08)",
      cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
      cardHoverBg: "#e8ecf1",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      headerBg: "linear-gradient(135deg, #1e293b 0%, #334155 40%, #1e293b 100%)",
      headerText: "#ffffff",
      headerSubtext: "rgba(147,197,253,0.8)",
      headerAccent: "rgba(147,197,253,0.5)",
      footerBg: "linear-gradient(135deg, #1e293b, #334155)",
      navBg: "rgba(241,245,249,0.95)",
      navBorder: "rgba(203,213,225,0.8)",
      navPillBg: "#f8fafc",
      navPillBorder: "#cbd5e1",
      navPillText: "#475569",
      slicerBg: "#f1f5f9",
      slicerBorder: "#cbd5e1",
      selectBg: "#ffffff",
      selectBorder: "#94a3b8",
      selectText: "#1e293b",
      tooltipBg: "#f8fafc",
      tooltipBorder: "#cbd5e1",
      tooltipText: "#334155",
      tableBorder: "#e2e8f0",
      tableHeaderBg: "#e2e8f0",
      tableRowHover: "rgba(241,245,249,0.8)",
      gridStroke: "#cbd5e1",
      axisTick: "#475569",
      dividerColor: "rgba(255,255,255,0.08)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
  dark: {
    label: "Dark",
    icon: "moon",
    colors: {
      pageBg: "#0f172a",
      pageGradient: "radial-gradient(ellipse at top, #1e293b, #0f172a 40%, #0f172a)",
      cardBg: "#1e293b",
      cardBorder: "rgba(255,255,255,0.08)",
      cardShadow: "0 1px 4px rgba(0,0,0,0.3)",
      cardHoverBg: "#263548",
      textPrimary: "#f1f5f9",
      textSecondary: "#94a3b8",
      textMuted: "#64748b",
      headerBg: "linear-gradient(135deg, #0c1222 0%, #162032 40%, #0c1222 100%)",
      headerText: "#f1f5f9",
      headerSubtext: "rgba(147,197,253,0.7)",
      headerAccent: "rgba(147,197,253,0.4)",
      footerBg: "linear-gradient(135deg, #0c1222, #162032)",
      navBg: "rgba(15,23,42,0.95)",
      navBorder: "rgba(255,255,255,0.06)",
      navPillBg: "#1e293b",
      navPillBorder: "rgba(255,255,255,0.1)",
      navPillText: "#94a3b8",
      slicerBg: "#162032",
      slicerBorder: "rgba(255,255,255,0.08)",
      selectBg: "#1e293b",
      selectBorder: "rgba(255,255,255,0.12)",
      selectText: "#e2e8f0",
      tooltipBg: "#1e293b",
      tooltipBorder: "rgba(255,255,255,0.1)",
      tooltipText: "#e2e8f0",
      tableBorder: "rgba(255,255,255,0.06)",
      tableHeaderBg: "#162032",
      tableRowHover: "rgba(30,41,59,0.8)",
      gridStroke: "rgba(255,255,255,0.08)",
      axisTick: "#94a3b8",
      dividerColor: "rgba(255,255,255,0.08)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
  "dark-grey": {
    label: "Dark Grey",
    icon: "moon",
    colors: {
      pageBg: "#1a1a2e",
      pageGradient: "radial-gradient(ellipse at top, #252547, #1a1a2e 40%, #1a1a2e)",
      cardBg: "#252547",
      cardBorder: "rgba(255,255,255,0.06)",
      cardShadow: "0 1px 4px rgba(0,0,0,0.3)",
      cardHoverBg: "#2d2d55",
      textPrimary: "#e8e8f0",
      textSecondary: "#9898b8",
      textMuted: "#6868a0",
      headerBg: "linear-gradient(135deg, #12122a 0%, #1e1e40 40%, #12122a 100%)",
      headerText: "#e8e8f0",
      headerSubtext: "rgba(160,170,255,0.7)",
      headerAccent: "rgba(160,170,255,0.4)",
      footerBg: "linear-gradient(135deg, #12122a, #1e1e40)",
      navBg: "rgba(26,26,46,0.95)",
      navBorder: "rgba(255,255,255,0.05)",
      navPillBg: "#252547",
      navPillBorder: "rgba(255,255,255,0.08)",
      navPillText: "#9898b8",
      slicerBg: "#1e1e3a",
      slicerBorder: "rgba(255,255,255,0.06)",
      selectBg: "#252547",
      selectBorder: "rgba(255,255,255,0.1)",
      selectText: "#d0d0e8",
      tooltipBg: "#252547",
      tooltipBorder: "rgba(255,255,255,0.08)",
      tooltipText: "#d0d0e8",
      tableBorder: "rgba(255,255,255,0.05)",
      tableHeaderBg: "#1e1e3a",
      tableRowHover: "rgba(37,37,71,0.8)",
      gridStroke: "rgba(255,255,255,0.06)",
      axisTick: "#9898b8",
      dividerColor: "rgba(255,255,255,0.06)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
  "baby-blue": {
    label: "Baby Blue",
    icon: "sun",
    colors: {
      pageBg: "#eff6ff",
      pageGradient: "radial-gradient(ellipse at top, #dbeafe, #eff6ff 40%, #eff6ff)",
      cardBg: "#f0f7ff",
      cardBorder: "rgba(59,130,246,0.12)",
      cardShadow: "0 1px 4px rgba(59,130,246,0.08)",
      cardHoverBg: "#e0efff",
      textPrimary: "#0c2d6b",
      textSecondary: "#3b6cb5",
      textMuted: "#7ba4d9",
      headerBg: "linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #1e40af 100%)",
      headerText: "#ffffff",
      headerSubtext: "rgba(191,219,254,0.8)",
      headerAccent: "rgba(191,219,254,0.5)",
      footerBg: "linear-gradient(135deg, #1e3a8a, #1e40af)",
      navBg: "rgba(239,246,255,0.95)",
      navBorder: "rgba(59,130,246,0.15)",
      navPillBg: "#f0f7ff",
      navPillBorder: "rgba(59,130,246,0.2)",
      navPillText: "#3b6cb5",
      slicerBg: "#e0efff",
      slicerBorder: "rgba(59,130,246,0.15)",
      selectBg: "#ffffff",
      selectBorder: "rgba(59,130,246,0.25)",
      selectText: "#0c2d6b",
      tooltipBg: "#f0f7ff",
      tooltipBorder: "rgba(59,130,246,0.2)",
      tooltipText: "#0c2d6b",
      tableBorder: "rgba(59,130,246,0.1)",
      tableHeaderBg: "#dbeafe",
      tableRowHover: "rgba(219,234,254,0.6)",
      gridStroke: "rgba(59,130,246,0.15)",
      axisTick: "#3b6cb5",
      dividerColor: "rgba(59,130,246,0.1)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
  golden: {
    label: "Golden",
    icon: "moon",
    colors: {
      pageBg: "#1c1917",
      pageGradient: "radial-gradient(ellipse at top, #292524, #1c1917 40%, #1c1917)",
      cardBg: "#292524",
      cardBorder: "rgba(197,168,128,0.15)",
      cardShadow: "0 1px 4px rgba(0,0,0,0.4)",
      cardHoverBg: "#332e2b",
      textPrimary: "#fef3c7",
      textSecondary: "#c5a880",
      textMuted: "#92785a",
      headerBg: "linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c1917 100%)",
      headerText: "#fef3c7",
      headerSubtext: "rgba(197,168,128,0.7)",
      headerAccent: "rgba(197,168,128,0.4)",
      footerBg: "linear-gradient(135deg, #1c1917, #292524)",
      navBg: "rgba(28,25,23,0.95)",
      navBorder: "rgba(197,168,128,0.12)",
      navPillBg: "#292524",
      navPillBorder: "rgba(197,168,128,0.15)",
      navPillText: "#c5a880",
      slicerBg: "#232120",
      slicerBorder: "rgba(197,168,128,0.12)",
      selectBg: "#292524",
      selectBorder: "rgba(197,168,128,0.2)",
      selectText: "#fef3c7",
      tooltipBg: "#292524",
      tooltipBorder: "rgba(197,168,128,0.15)",
      tooltipText: "#fef3c7",
      tableBorder: "rgba(197,168,128,0.08)",
      tableHeaderBg: "#232120",
      tableRowHover: "rgba(41,37,36,0.8)",
      gridStroke: "rgba(197,168,128,0.12)",
      axisTick: "#c5a880",
      dividerColor: "rgba(197,168,128,0.1)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "sepia(0.3) brightness(1.1)",
    },
  },
  pzone: {
    label: "P.ZONE",
    icon: "moon",
    colors: {
      pageBg: "#0a0e1a",
      pageGradient: "radial-gradient(ellipse at top, #141b2d, #0a0e1a 40%, #0a0e1a)",
      cardBg: "#111827",
      cardBorder: "rgba(139,92,246,0.12)",
      cardShadow: "0 1px 6px rgba(139,92,246,0.1)",
      cardHoverBg: "#1a2236",
      textPrimary: "#e8def8",
      textSecondary: "#a78bfa",
      textMuted: "#7c5cbf",
      headerBg: "linear-gradient(135deg, #0d9488 0%, #7c3aed 35%, #db2777 70%, #ea580c 100%)",
      headerText: "#ffffff",
      headerSubtext: "rgba(232,222,248,0.8)",
      headerAccent: "rgba(167,139,250,0.5)",
      footerBg: "linear-gradient(135deg, #0d9488, #7c3aed, #db2777)",
      navBg: "rgba(10,14,26,0.95)",
      navBorder: "rgba(139,92,246,0.1)",
      navPillBg: "#111827",
      navPillBorder: "rgba(139,92,246,0.15)",
      navPillText: "#a78bfa",
      slicerBg: "#141b2d",
      slicerBorder: "rgba(139,92,246,0.1)",
      selectBg: "#111827",
      selectBorder: "rgba(139,92,246,0.2)",
      selectText: "#e8def8",
      tooltipBg: "#111827",
      tooltipBorder: "rgba(139,92,246,0.15)",
      tooltipText: "#e8def8",
      tableBorder: "rgba(139,92,246,0.06)",
      tableHeaderBg: "#141b2d",
      tableRowHover: "rgba(17,24,39,0.8)",
      gridStroke: "rgba(139,92,246,0.1)",
      axisTick: "#a78bfa",
      dividerColor: "rgba(139,92,246,0.08)",
      logoSrc: "/logos/pzone-horizontal-white.png",
      logoFooterSrc: "/logos/pzone-horizontal-white.png",
      logoFilter: "none",
    },
  },
};

const THEME_STORAGE_KEY = "pzone_board_theme";

function ThemeSwitcher({ current, onChange }: { current: BoardThemeMode; onChange: (mode: BoardThemeMode) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const modes: BoardThemeMode[] = ["light", "baby-blue", "grey", "dark", "dark-grey", "golden", "pzone"];
  const isDark = current === "dark" || current === "dark-grey" || current === "golden" || current === "pzone";

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.max(rect.right - 200, 8) });
    }
  }, [open]);

  return (
    <div className="print:hidden">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold backdrop-blur-xl transition-all hover:scale-105"
        style={{
          background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
          color: isDark ? "#e2e8f0" : "#475569",
        }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
        {THEMES[current].label}
      </button>
      {open && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              zIndex: 9999,
              top: pos.top,
              left: pos.left,
              width: 196,
              background: isDark ? "#1e293b" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"}`,
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)",
              padding: "4px 0",
            }}
          >
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => { onChange(mode); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: current === mode ? "#3b82f6" : (isDark ? "#cbd5e1" : "#475569"),
                  background: current === mode
                    ? (isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.06)")
                    : "transparent",
                  textAlign: "left" as const,
                }}
              >
                <span style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: mode === "pzone"
                    ? "linear-gradient(135deg, #0d9488, #7c3aed, #db2777)"
                    : THEMES[mode].colors.pageBg,
                  border: `2px solid ${current === mode ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1")}`,
                }} />
                <span style={{ flex: 1 }}>{THEMES[mode].label}</span>
                {current === mode && <Check size={12} style={{ opacity: 0.7 }} />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

const BoardThemeContext = createContext<BoardThemeColors>(THEMES.light.colors);
function useBoardTheme() { return useContext(BoardThemeContext); }

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777", "#0891b2"];
const AGING_COLORS = ["#16a34a", "#d97706", "#ea580c", "#dc2626"];

const fmtMoney = (value: number) => fmtCompact(value || 0);
const fmtFull = (value: number) => fmtNum(value || 0);
const fmtPct = (value: number) => fmtPercent(Number.isFinite(value) ? value : 0);

const statusLabel = (status?: string | null) => {
  const raw = status || "Unknown";
  if (raw.includes("معتمد")) return "Approved";
  if (raw.includes("تحت")) return "Pending";
  if (raw.includes("مراج")) return "Under Review";
  if (raw.includes("ختام")) return "Final";
  if (raw.includes("رفض") || raw.includes("مرفوض")) return "Rejected";
  return raw;
};

const statusColor = (status?: string | null) => {
  const label = statusLabel(status);
  if (label === "Approved") return "#16a34a";
  if (label === "Pending") return "#d97706";
  if (label === "Under Review") return "#2563eb";
  if (label === "Final") return "#7c3aed";
  if (label === "Rejected") return "#dc2626";
  return "#64748b";
};

const invoiceRank = (invoiceNumber?: string | null) => {
  const match = String(invoiceNumber || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const invoiceMonth = (invoice: Invoice) => {
  const raw = invoice.submitted_date || invoice.approval_date || invoice.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  return { key, label };
};

const ChartTooltip = ({ active, payload, label }: any) => {
  const tc = useBoardTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3.5 text-xs shadow-lg backdrop-blur-xl" style={{ background: tc.tooltipBg, border: `1px solid ${tc.tooltipBorder}` }}>
      {label && <div className="mb-2 font-bold" style={{ color: tc.tooltipText }}>{label}</div>}
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-5 py-0.5">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} /><span style={{ color: tc.textSecondary }}>{item.name}</span></span>
          <span className="font-mono font-bold" style={{ color: tc.textPrimary }}>
            {typeof item.value === "number" ? fmtFull(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function getTone(score: number) {
  if (score >= 80) return { label: "Strong", color: "#16a34a", bg: "#f0fdf4" };
  if (score >= 60) return { label: "Watch", color: "#d97706", bg: "#fffbeb" };
  return { label: "Critical", color: "#dc2626", bg: "#fef2f2" };
}

function KPI({
  icon: Icon,
  label,
  labelAr,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  labelAr: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}) {
  const tc = useBoardTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: `linear-gradient(135deg, ${tc.cardBg} 0%, ${color}08 100%)`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 8px 24px ${color}12`,
        border: `1px solid ${color}18`,
      }}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.12]" style={{ background: color }} />
      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}14`, boxShadow: `0 4px 12px ${color}20` }}>
          <Icon size={19} style={{ color }} />
        </div>
        <div className="mb-0.5 text-2xl font-black tracking-tight" style={{ color: tc.textPrimary }}>{value}</div>
        <div className="text-[11px] font-semibold" style={{ color: tc.textSecondary }}>
          {label} <span className="font-normal" style={{ color: tc.textMuted }}>/ {labelAr}</span>
        </div>
        {sub && <div className="mt-1.5 text-[10px] font-mono" style={{ color: tc.textMuted }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

function ChartCard({ id, title, subtitle, icon: Icon, color, children, delay = 0.3, onReset }: {
  id?: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  delay?: number;
  onReset?: () => void;
}) {
  const tc = useBoardTheme();
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden rounded-2xl"
      style={{ background: tc.cardBg, boxShadow: tc.cardShadow, border: `1px solid ${tc.cardBorder}` }}
    >
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute left-0 top-0 h-full w-1 rounded-r-full" style={{ background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 text-sm font-bold" style={{ color: tc.textPrimary }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}12` }}>
              <Icon size={14} style={{ color }} />
            </div>
            {title}
          </h3>
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all hover:shadow-sm"
              style={{ color, background: `${color}0a`, border: `1px solid ${color}25` }}
            >
              <RotateCcw size={10} />
              Reset filter
            </button>
          )}
        </div>
        {subtitle && <p className="mt-1 pl-[38px] text-[10px]" style={{ color: tc.textSecondary }}>{subtitle}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  );
}

const ALL_VALUE = "__all__";

type BoardProjectSort = "contract" | "outstanding" | "collection";

interface BoardSlicerState {
  projectCode: string;
  client: string;
  sector: string;
  status: string;
  monthFrom: string;
  monthTo: string;
  projectSort: BoardProjectSort;
}

interface SlicerOption {
  value: string;
  label: string;
}

const DEFAULT_SLICERS: BoardSlicerState = {
  projectCode: ALL_VALUE,
  client: ALL_VALUE,
  sector: ALL_VALUE,
  status: ALL_VALUE,
  monthFrom: ALL_VALUE,
  monthTo: ALL_VALUE,
  projectSort: "outstanding",
};

type DrillSource = "month" | "sector" | "client" | "status" | null;

function DrillDownBanner({ source, label, onClear }: { source: DrillSource; label: string; onClear: () => void }) {
  if (!source) return null;
  const colorMap: Record<string, string> = { month: "#2563eb", sector: "#7c3aed", client: "#d97706", status: "#16a34a" };
  const iconLabel: Record<string, string> = { month: "Month", sector: "Sector", client: "Client", status: "Status" };
  const accent = colorMap[source] || "#2563eb";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between gap-3 rounded-xl px-5 py-3"
      style={{ background: `${accent}08`, border: `1px solid ${accent}22` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: accent }}>
          <Filter size={13} />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
            Drill-Down Active — {iconLabel[source]}
          </div>
          <div className="text-xs font-semibold" style={{ color: t.textPrimary }}>
            Filtered by: <span className="font-black" style={{ color: accent }}>{label}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:shadow-sm"
        style={{ color: accent, background: `${accent}10`, border: `1px solid ${accent}30` }}
      >
        <X size={12} />
        Clear drill-down
      </button>
    </motion.div>
  );
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function formatMonthOption(key: string) {
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function invoiceMonthKey(invoice: Invoice) {
  return invoiceMonth(invoice)?.key || null;
}

function selectClassName(tc: BoardThemeColors) {
  return `h-10 w-full rounded-xl px-3 text-xs font-semibold outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:shadow-md`;
}

function SlicerSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: SlicerOption[];
  allLabel?: string;
  onChange: (value: string) => void;
}) {
  const tc = useBoardTheme();
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: tc.textSecondary }}>{label}</span>
      <select
        className={selectClassName(tc)}
        style={{ background: tc.selectBg, border: `1px solid ${tc.selectBorder}`, color: tc.selectText }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {allLabel && <option value={ALL_VALUE}>{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SharedBoardSlicers({
  slicers,
  options,
  activeCount,
  filteredCount,
  totalCount,
  onChange,
  onReset,
}: {
  slicers: BoardSlicerState;
  options: {
    projects: SlicerOption[];
    clients: SlicerOption[];
    sectors: SlicerOption[];
    statuses: SlicerOption[];
    months: SlicerOption[];
  };
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onChange: <K extends keyof BoardSlicerState>(key: K, value: BoardSlicerState[K]) => void;
  onReset: () => void;
}) {
  const tc = useBoardTheme();
  return (
    <section className="overflow-hidden rounded-2xl" style={{ background: tc.cardBg, boxShadow: tc.cardShadow, border: `1px solid ${tc.cardBorder}` }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${tc.tableBorder}` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #2563eb12, #2563eb08)" }}>
              <Filter size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: tc.textPrimary }}>Shared Filters / Slicers</h2>
              <p className="text-[11px]" style={{ color: tc.textSecondary }}>Read-only filters inside the shared snapshot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl px-3.5 py-2 text-[11px] font-bold text-blue-700" style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe" }}>
              {filteredCount} / {totalCount} IPCs
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0 && slicers.projectSort === DEFAULT_SLICERS.projectSort}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: `1px solid ${tc.selectBorder}`, color: tc.textSecondary }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        <SlicerSelect label="Project" value={slicers.projectCode} options={options.projects} allLabel="All projects" onChange={(value) => onChange("projectCode", value)} />
        <SlicerSelect label="Client" value={slicers.client} options={options.clients} allLabel="All clients" onChange={(value) => onChange("client", value)} />
        <SlicerSelect label="Sector" value={slicers.sector} options={options.sectors} allLabel="All sectors" onChange={(value) => onChange("sector", value)} />
        <SlicerSelect label="Status" value={slicers.status} options={options.statuses} allLabel="All statuses" onChange={(value) => onChange("status", value)} />
        <SlicerSelect label="Month from" value={slicers.monthFrom} options={options.months} allLabel="Start" onChange={(value) => onChange("monthFrom", value)} />
        <SlicerSelect label="Month to" value={slicers.monthTo} options={options.months} allLabel="End" onChange={(value) => onChange("monthTo", value)} />
        <SlicerSelect
          label="Project ranking"
          value={slicers.projectSort}
          options={[
            { value: "outstanding", label: "Outstanding first" },
            { value: "contract", label: "Contract value" },
            { value: "collection", label: "Collection gap" },
          ]}
          onChange={(value) => onChange("projectSort", value as BoardProjectSort)}
        />
        <div className="rounded-xl p-3" style={{ background: tc.slicerBg, border: `1px solid ${tc.slicerBorder}` }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: tc.textSecondary }}>Active slicers</div>
          <div className="mt-1 text-lg font-black" style={{ color: tc.textPrimary }}>{activeCount}</div>
          <div className="text-[10px]" style={{ color: tc.textMuted }}>Applied to KPIs, charts, alerts, and tables</div>
        </div>
      </div>
    </section>
  );
}

function ExecutiveBrief({
  score,
  collected,
  outstanding,
  unbilled,
  approvalRate,
  collectionEfficiency,
  highestOutstanding,
  largestGap,
}: {
  score: number;
  collected: number;
  outstanding: number;
  unbilled: number;
  approvalRate: number;
  collectionEfficiency: number;
  highestOutstanding?: { label: string; value: number };
  largestGap?: { label: string; value: number };
}) {
  const tc = useBoardTheme();
  const tone = getTone(score);
  const rows = [
    { label: "Approved collection efficiency", value: fmtPct(collectionEfficiency), color: collectionEfficiency >= 0.75 ? "#16a34a" : "#d97706" },
    { label: "Approval conversion", value: fmtPct(approvalRate), color: approvalRate >= 0.75 ? "#16a34a" : "#dc2626" },
    { label: "Outstanding receivable", value: fmtMoney(outstanding), color: outstanding > collected * 0.5 ? "#dc2626" : "#d97706" },
    { label: "Remaining to bill", value: fmtMoney(unbilled), color: "#2563eb" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]"
    >
      {/* Health Score — Dark premium card */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "linear-gradient(145deg, #0f172a, #1e293b)", boxShadow: "0 8px 32px rgba(15,23,42,0.25)" }}
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: tone.color }} />
        <div className="relative">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Executive Health</div>
          <div className="mb-5 flex items-end justify-between">
            <div className="text-4xl font-black text-white">{score}<span className="ml-1 text-lg text-slate-500">/100</span></div>
            <div className="rounded-lg px-3 py-1.5 text-xs font-black" style={{ color: tone.color, background: `${tone.color}18`, border: `1px solid ${tone.color}40` }}>
              {tone.label}
            </div>
          </div>
          <div className="relative mb-5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${tone.color}66, ${tone.color})`, boxShadow: `0 0 12px ${tone.color}60` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              { label: "Cash In", val: fmtMoney(collected), clr: "#d97706", bg: "rgba(217,119,6,0.1)" },
              { label: "Open AR", val: fmtMoney(outstanding), clr: "#dc2626", bg: "rgba(220,38,38,0.1)" },
              { label: "Unbilled", val: fmtMoney(unbilled), clr: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-2.5" style={{ background: item.bg }}>
                <div className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</div>
                <div className="font-mono text-xs font-black" style={{ color: item.clr }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Board Brief — Editorial card */}
      <div className="overflow-hidden rounded-2xl" style={{ background: tc.cardBg, boxShadow: tc.cardShadow, border: `1px solid ${tc.cardBorder}` }}>
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${tc.tableBorder}` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold" style={{ color: tc.textPrimary }}>Board Brief — ملخص تنفيذي</div>
              <div className="text-[11px]" style={{ color: tc.textSecondary }}>Cash, approvals, receivables, and immediate risk signals</div>
            </div>
            <div className="hidden rounded-xl px-3.5 py-2 text-right md:block" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: tc.textSecondary }}>Highest Outstanding</div>
              <div className="font-mono text-xs font-bold" style={{ color: "#dc2626" }}>{highestOutstanding ? `${highestOutstanding.label} / ${fmtMoney(highestOutstanding.value)}` : "-"}</div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors" style={{ borderLeft: `3px solid ${row.color}`, background: tc.cardHoverBg }}>
                <span className="text-xs font-medium" style={{ color: tc.textSecondary }}>{row.label}</span>
                <span className="font-mono text-sm font-black" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Largest Approval Gap</div>
              <div className="mt-1.5 font-mono text-xs font-black" style={{ color: tc.textPrimary }}>{largestGap ? `${largestGap.label} / ${fmtPct(largestGap.value)}` : "-"}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#d97706" }}>Board Focus</div>
              <div className="mt-1.5 text-xs font-semibold" style={{ color: tc.textPrimary }}>{outstanding > collected ? "Collections pressure is the leading risk" : "Cash collection is tracking ahead of risk"}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ProjectPanel({ projectCode, invoices, onClose }: { projectCode: string | null; invoices: Invoice[]; onClose: () => void }) {
  const tc = useBoardTheme();
  const projectInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.project_code === projectCode)
      .sort((a, b) => invoiceRank(a.invoice_number) - invoiceRank(b.invoice_number));
  }, [invoices, projectCode]);

  const latest = projectInvoices[projectInvoices.length - 1];
  const projectName = latest?.project_name || "";
  const client = latest?.client || "Unknown";
  const sector = latest?.sector || "-";
  const contractValue = latest?.contract_value || 0;
  const submitted = latest?.work_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.work_current || 0), 0);
  const approved = latest?.approved_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.approved_current || 0), 0);
  const approvedNet = latest?.approved_net_total || projectInvoices.reduce((sum, invoice) => sum + (invoice.approved_net_current || 0), 0);
  const collected = projectInvoices.reduce((sum, invoice) => sum + (invoice.total_collections || 0), 0);
  const gapPct = submitted > 0 ? Math.max((submitted - approved) / submitted, 0) : 0;

  const curveData = useMemo(() => {
    return projectInvoices.map((invoice) => ({
      name: `IPC #${invoice.invoice_number || "-"}`,
      Submitted: invoice.work_total || 0,
      Approved: invoice.approved_total || 0,
      Collected: invoice.total_collections || 0,
    }));
  }, [projectInvoices]);

  const deductionData = useMemo(() => {
    const map = new Map<string, number>();
    projectInvoices.forEach((invoice) => {
      (invoice.deductions_breakdown || []).forEach((item) => {
        map.set(item.name || "Other", (map.get(item.name || "Other") || 0) + (item.amount || 0));
      });
      (invoice.approved_deductions_breakdown || []).forEach((item) => {
        map.set(`Approved ${item.name || "Deduction"}`, (map.get(`Approved ${item.name || "Deduction"}`) || 0) + (item.amount || 0));
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter((item) => item.value > 0);
  }, [projectInvoices]);

  return (
    <AnimatePresence>
      {projectCode && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-3xl overflow-y-auto shadow-2xl"
            style={{ background: tc.pageBg, borderLeft: `1px solid ${tc.cardBorder}` }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-xl" style={{ background: tc.cardBg, borderBottom: `1px solid ${tc.cardBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.1)" }}>
                  <Building2 size={20} style={{ color: "#2563eb" }} />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: tc.textPrimary }}>{projectCode}</h2>
                  <p className="text-xs" style={{ color: tc.textSecondary }}>{projectName}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 transition" style={{ color: tc.textMuted }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["Client", client, "#2563eb"],
                  ["Sector", sector, "#7c3aed"],
                  ["Contract Value", fmtMoney(contractValue), "#16a34a"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: tc.slicerBg, border: `1px solid ${tc.cardBorder}` }}>
                    <div className="mb-1 text-[10px]" style={{ color: tc.textSecondary }}>{label}</div>
                    <div className="text-sm font-black" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KPI icon={FileSpreadsheet} label="Total Submitted" labelAr="المقدم" value={fmtMoney(submitted)} color="#2563eb" delay={0} />
                <KPI icon={Check} label="Total Approved" labelAr="المعتمد" value={fmtMoney(approved)} color="#16a34a" delay={0.03} />
                <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(collected)} color="#d97706" delay={0.06} />
                <KPI icon={AlertTriangle} label="Approval Gap" labelAr="فجوة الاعتماد" value={fmtPct(gapPct)} color={gapPct > 0.25 ? "#dc2626" : "#d97706"} delay={0.09} />
              </div>

              <ChartCard title="Cumulative IPC Curve - منحنى المستخلصات" icon={TrendingUp} color="#7c3aed">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tc.gridStroke} />
                    <XAxis dataKey="name" tick={{ fill: tc.axisTick, fontSize: 11 }} />
                    <YAxis tick={{ fill: tc.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Submitted" stroke="#2563eb" fill="#2563eb18" strokeWidth={2} />
                    <Area type="monotone" dataKey="Approved" stroke="#16a34a" fill="#16a34a18" strokeWidth={2} />
                    <Area type="monotone" dataKey="Collected" stroke="#d97706" fill="#d9770618" strokeWidth={2} strokeDasharray="4 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`IPC History - سجل المستخلصات (${projectInvoices.length})`} icon={Wallet} color="#7c3aed">
                <div className="space-y-3">
                  {projectInvoices.map((invoice, index) => {
                    const color = statusColor(invoice.status);
                    return (
                      <div key={`${invoice.id}-${index}`} className="rounded-lg p-4" style={{ background: tc.slicerBg, border: `1px solid ${tc.cardBorder}` }}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black" style={{ color: tc.textPrimary }}>IPC #{invoice.invoice_number || "-"}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color, background: `${color}14` }}>
                              {statusLabel(invoice.status)}
                            </span>
                          </div>
                          <span className="text-[10px]" style={{ color: tc.textMuted }}>{invoice.submitted_date || invoice.approval_date || "-"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-[10px]" style={{ color: tc.textSecondary }}>Submitted</div>
                            <div className="font-mono text-xs font-black" style={{ color: "#2563eb" }}>{fmtMoney(invoice.work_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px]" style={{ color: tc.textSecondary }}>Approved</div>
                            <div className="font-mono text-xs font-black" style={{ color: "#16a34a" }}>{fmtMoney(invoice.approved_total || 0)}</div>
                          </div>
                          <div>
                            <div className="text-[10px]" style={{ color: tc.textSecondary }}>Collected</div>
                            <div className="font-mono text-xs font-black" style={{ color: "#d97706" }}>{fmtMoney(invoice.total_collections || 0)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              {deductionData.length > 0 && (
                <ChartCard title="Deduction Breakdown - تفصيل الاستقطاعات" icon={Percent} color="#dc2626">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie data={deductionData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={74} paddingAngle={3}>
                          {deductionData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {deductionData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                            <span className="truncate" style={{ color: tc.textSecondary }}>{item.name}</span>
                          </div>
                          <span className="font-mono font-bold" style={{ color: tc.textPrimary }}>{fmtMoney(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface Props {
  token: string;
  signedUrl?: string | null;
  initialPage?: string | null;
  initialOverrides?: Record<string, number>;
}

export function IPCBoardView({ token, signedUrl, initialPage, initialOverrides }: Props) {
  const { data: boardSnapshot, isLoading, error } = useIPCBoardSnapshot(token);
  const allInvoices = boardSnapshot?.invoices || [];
  const [slicers, setSlicers] = useState<BoardSlicerState>(DEFAULT_SLICERS);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [drillSource, setDrillSource] = useState<DrillSource>(null);
  const [drillLabel, setDrillLabel] = useState("");
  const [themeMode, setThemeMode] = useState<BoardThemeMode>(() => {
    try { return (localStorage.getItem(THEME_STORAGE_KEY) as BoardThemeMode) || "light"; } catch { return "light"; }
  });
  const t = THEMES[themeMode].colors;
  const switchTheme = useCallback((mode: BoardThemeMode) => {
    setThemeMode(mode);
    try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch {}
  }, []);

  const drillDown = useCallback((source: DrillSource, key: keyof BoardSlicerState, value: string, label: string) => {
    setDrillSource(source);
    setDrillLabel(label);
    setSelectedProject(null);
    setSlicers((prev) => ({ ...DEFAULT_SLICERS, [key]: value }));
  }, []);

  const clearDrill = useCallback(() => {
    setDrillSource(null);
    setDrillLabel("");
    setSelectedProject(null);
    setSlicers(DEFAULT_SLICERS);
  }, []);

  // Seed overrides from URL param so shared links show edited values
  const { overrides, setOverride, applyOverrides } = useMonthlyOverrides();
  useEffect(() => {
    if (!initialOverrides) return;
    Object.entries(initialOverrides).forEach(([key, value]) => setOverride(key, value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slicerOptions = useMemo(() => {
    const months = Array.from(new Set(allInvoices.map(invoiceMonthKey).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: formatMonthOption(value) }));
    return {
      projects: uniqueOptions(allInvoices.map((invoice) => invoice.project_code))
        .map((option) => {
          const invoice = allInvoices.find((row) => row.project_code === option.value);
          return {
            value: option.value,
            label: invoice?.project_name ? `${option.value} - ${invoice.project_name}` : option.value,
          };
        }),
      clients: uniqueOptions(allInvoices.map((invoice) => invoice.client || "Unknown")),
      sectors: uniqueOptions(allInvoices.map((invoice) => invoice.sector || "Other")),
      statuses: uniqueOptions(allInvoices.map((invoice) => invoice.status))
        .map((option) => ({ value: option.value, label: statusLabel(option.value) })),
      months,
    };
  }, [allInvoices]);

  const normalizedMonthRange = useMemo(() => {
    const from = slicers.monthFrom === ALL_VALUE ? null : slicers.monthFrom;
    const to = slicers.monthTo === ALL_VALUE ? null : slicers.monthTo;
    if (from && to && from > to) return { from: to, to: from };
    return { from, to };
  }, [slicers.monthFrom, slicers.monthTo]);

  const financialFilters = useMemo(() => ({
    projectCodes: slicers.projectCode !== ALL_VALUE ? [slicers.projectCode] : undefined,
    clients: slicers.client !== ALL_VALUE ? [slicers.client] : undefined,
    sectors: slicers.sector !== ALL_VALUE ? [slicers.sector] : undefined,
    statuses: slicers.status !== ALL_VALUE ? [slicers.status] : undefined,
    dateFrom: normalizedMonthRange.from ? `${normalizedMonthRange.from}-01` : undefined,
    dateTo: normalizedMonthRange.to ? `${normalizedMonthRange.to}-01` : undefined,
  }), [normalizedMonthRange.from, normalizedMonthRange.to, slicers.client, slicers.projectCode, slicers.sector, slicers.status]);

  const invoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      if (slicers.projectCode !== ALL_VALUE && invoice.project_code !== slicers.projectCode) return false;
      if (slicers.client !== ALL_VALUE && (invoice.client || "Unknown") !== slicers.client) return false;
      if (slicers.sector !== ALL_VALUE && (invoice.sector || "Other") !== slicers.sector) return false;
      if (slicers.status !== ALL_VALUE && invoice.status !== slicers.status) return false;
      const key = invoiceMonthKey(invoice);
      if (normalizedMonthRange.from && (!key || key < normalizedMonthRange.from)) return false;
      if (normalizedMonthRange.to && (!key || key > normalizedMonthRange.to)) return false;
      return true;
    });
  }, [allInvoices, normalizedMonthRange.from, normalizedMonthRange.to, slicers.client, slicers.projectCode, slicers.sector, slicers.status]);

  const activeSlicerCount = useMemo(() => {
    return [
      slicers.projectCode,
      slicers.client,
      slicers.sector,
      slicers.status,
      slicers.monthFrom,
      slicers.monthTo,
    ].filter((value) => value !== ALL_VALUE).length;
  }, [slicers]);

  const updateSlicer = <K extends keyof BoardSlicerState>(key: K, value: BoardSlicerState[K]) => {
    setSelectedProject(null);
    setSlicers((current) => ({ ...current, [key]: value }));
  };

  const financial = useMemo(() => computeFinancialSnapshot({
    invoices: allInvoices,
    collections: boardSnapshot?.collections || [],
    cashFlowTransactions: boardSnapshot?.cashFlowTransactions || [],
    forecasts: boardSnapshot?.forecasts || [],
    filters: financialFilters,
  }), [allInvoices, boardSnapshot, financialFilters]);
  const showCharts = boardSnapshot?.scope?.includeCharts !== false;
  const showTables = boardSnapshot?.scope?.includeTables !== false;

  const stats = useMemo(() => {
    const { portfolio } = financial;
    const submitted = portfolio.total_submitted;
    const approved = portfolio.total_approved;
    const approvedNet = portfolio.total_approved_net;
    const collected = portfolio.total_collections;
    const deductions = invoices.reduce((sum, invoice) => sum + (invoice.total_deductions || 0) + (invoice.approved_deductions || 0), 0);
    const outstanding = portfolio.total_outstanding;
    const contractValue = portfolio.total_contract_value;
    const unbilled = Math.max(contractValue - submitted, 0);
    const pending = invoices.filter((invoice) => statusLabel(invoice.status) === "Pending").length;
    const approvedCount = invoices.filter((invoice) => statusLabel(invoice.status) === "Approved").length;
    const approvalRate = submitted > 0 ? approvedNet / submitted : 0;
    const collectionEfficiency = portfolio.overall_collection_rate;
    return {
      projectCount: portfolio.project_count,
      ipcCount: invoices.length,
      contractValue,
      submitted,
      approved,
      approvedNet,
      collected,
      deductions,
      outstanding,
      unbilled,
      pending,
      approvedCount,
      approvalRate,
      collectionEfficiency,
    };
  }, [financial, invoices]);

  const displayMonthly = useMemo(() => applyOverrides(financial.monthly), [financial.monthly, overrides]);

  const monthlyTrend = useMemo(() => {
    return displayMonthly.map((row) => ({
      key: row.monthKey,
      month: row.month,
      submitted: row.submitted,
      approved: row.approved,
      collected: row.actualCollected,
      forecast: row.forecastCashIn,
    }));
  }, [displayMonthly]);

  const cashPositionTrend = useMemo(() => {
    return displayMonthly.map((row) => ({
      key: row.monthKey,
      month: row.month,
      actualIn: row.actualCollected,
      actualOut: -row.actualCashOut,
      forecastIn: row.forecastCashIn,
      forecastOut: -row.forecastCashOut,
      netForecast: row.netForecast,
    }));
  }, [displayMonthly]);

  const sectorData = useMemo(() => {
    const map = new Map<string, { sector: string; contractValue: number; submitted: number; approved: number }>();
    const seenContract = new Set<string>();
    invoices.forEach((invoice) => {
      const sector = invoice.sector || "Other";
      const row = map.get(sector) || { sector, contractValue: 0, submitted: 0, approved: 0 };
      if (!seenContract.has(invoice.project_code)) {
        row.contractValue += invoice.contract_value || 0;
        seenContract.add(invoice.project_code);
      }
      row.submitted += invoice.work_total || 0;
      row.approved += invoice.approved_total || 0;
      map.set(sector, row);
    });
    return Array.from(map.values()).sort((a, b) => b.contractValue - a.contractValue);
  }, [invoices]);

  const statusData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; amount: number }>();
    invoices.forEach((invoice) => {
      const name = statusLabel(invoice.status);
      const row = map.get(name) || { name, value: 0, amount: 0 };
      row.value += 1;
      row.amount += invoice.work_total || 0;
      map.set(name, row);
    });
    const order = ["Approved", "Pending", "Under Review", "Final", "Rejected", "Unknown"];
    return Array.from(map.values()).sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [invoices]);

  const clientData = useMemo(() => {
    const map = new Map<string, { client: string; approved: number; collected: number; outstanding: number }>();
    financial.projects.forEach((project) => {
      const client = (project.client || "Unknown").trim();
      const row = map.get(client) || { client, approved: 0, collected: 0, outstanding: 0 };
      row.approved += project.approved_net;
      row.collected += project.actual_collected;
      row.outstanding += project.outstanding;
      map.set(client, row);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  }, [financial.projects]);

  const waterfallData = useMemo(() => {
    const net = Math.max(stats.submitted - stats.deductions, 0);
    return [
      { name: "Gross Work", value: stats.submitted, fill: "#2563eb" },
      { name: "Deductions", value: -stats.deductions, fill: "#dc2626" },
      { name: "Net Submitted", value: net, fill: "#16a34a" },
      { name: "Approved Net", value: stats.approvedNet, fill: "#0d9488" },
      { name: "Collected", value: stats.collected, fill: "#d97706" },
    ];
  }, [stats]);

  const agingData = useMemo(() => {
    return financial.aging.map((bucket, index) => ({
      range: bucket.days,
      amount: bucket.amount,
      fill: AGING_COLORS[index] || "#dc2626",
    }));
  }, [financial.aging]);

  const delayData = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.submitted_date && invoice.approval_date)
      .map((invoice) => {
        const submitted = new Date(invoice.submitted_date!);
        const approved = new Date(invoice.approval_date!);
        const days = Math.max(Math.ceil((approved.getTime() - submitted.getTime()) / 86_400_000), 0);
        return {
          label: `${invoice.project_code} / IPC #${invoice.invoice_number || "-"}`,
          days,
          net: invoice.approved_net_total || 0,
          color: days <= 28 ? "#16a34a" : days <= 56 ? "#d97706" : "#dc2626",
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 12);
  }, [invoices]);

  const projects = useMemo(() => {
    return financial.projects.map((project) => ({
      code: project.project_code,
      name: project.project_name,
      client: project.client,
      contractValue: project.contract_value,
      submitted: project.submitted_total,
      approved: project.approved_total,
      approvedNet: project.approved_net,
      collected: project.actual_collected,
      latestStatus: project.status,
      ipcCount: project.ipc_count,
      outstanding: project.outstanding,
      collectionEfficiency: project.collection_efficiency,
    })).sort((a, b) => {
      if (slicers.projectSort === "contract") return b.contractValue - a.contractValue || a.code.localeCompare(b.code);
      if (slicers.projectSort === "collection") return a.collectionEfficiency - b.collectionEfficiency || b.outstanding - a.outstanding || a.code.localeCompare(b.code);
      return b.outstanding - a.outstanding || b.contractValue - a.contractValue || a.code.localeCompare(b.code);
    });
  }, [financial.projects, slicers.projectSort]);

  const boardSignals = useMemo(() => {
    const highestOutstanding = projects
      .map((project) => ({ label: project.code, value: Math.max(project.approvedNet - project.collected, 0) }))
      .sort((a, b) => b.value - a.value)[0];

    const largestGap = projects
      .map((project) => ({
        label: project.code,
        value: project.submitted > 0 ? Math.max((project.submitted - project.approved) / project.submitted, 0) : 0,
      }))
      .sort((a, b) => b.value - a.value)[0];

    const collectionScore = Math.min(stats.collectionEfficiency, 1) * 35;
    const approvalScore = Math.min(stats.approvalRate, 1) * 30;
    const outstandingPressure = stats.approvedNet > 0 ? Math.min(stats.outstanding / stats.approvedNet, 1) : 0;
    const pendingPressure = stats.ipcCount > 0 ? Math.min(stats.pending / stats.ipcCount, 1) : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(35 + collectionScore + approvalScore - outstandingPressure * 22 - pendingPressure * 18)));

    return { highestOutstanding, largestGap, healthScore };
  }, [projects, stats]);

  const alerts = useMemo(() => {
    return financial.controlIssues
      .filter((issue) => issue.project_code)
      .map((issue) => ({
        type: issue.severity === "critical" ? "critical" as const : "warning" as const,
        project: issue.project_code!,
        message: `${issue.project_code}: ${issue.title}`,
        value: issue.value,
      }))
      .slice(0, 10);
  }, [financial.controlIssues]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: t.pageBg }}>
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full" style={{ border: "2px solid transparent", borderTopColor: "#2563eb", borderRightColor: "#7c3aed" }} />
            <div className="absolute inset-2 animate-spin rounded-full" style={{ border: "2px solid transparent", borderBottomColor: "#0d9488", animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: t.textSecondary }}>Loading board data...</p>
          <p className="mt-1 text-[11px]" style={{ color: t.textMuted }}>Preparing your executive snapshot</p>
        </div>
      </div>
    );
  }

  if (error || allInvoices.length === 0) {
    const errMsg = String((error as any)?.message || "");
    const isRevoked = errMsg.startsWith("REVOKED:");
    const isExpired = errMsg.startsWith("EXPIRED:");
    const isNotFound = errMsg.startsWith("NOT_FOUND:");

    const title = isRevoked
      ? "Link Revoked — تم إلغاء الرابط"
      : isExpired
        ? "Link Expired — انتهت صلاحية الرابط"
        : isNotFound
          ? "Invalid Link — رابط غير صالح"
          : "No shared dashboard data";

    const subtitle = isRevoked
      ? "This share link has been revoked by the administrator. Please request a new link."
      : isExpired
        ? "This share link has expired. Please request a new link from the project administrator."
        : isNotFound
          ? "This share link does not exist or was never created."
          : "This link has no online snapshot data. Regenerate the share link.";

    const borderColor = isRevoked ? "#fecaca" : isExpired ? "#fde68a" : "#fecaca";
    const bgColor = isRevoked ? "#fef2f2" : isExpired ? "#fffbeb" : "#fef2f2";
    const iconColor = isRevoked ? "text-red-500" : isExpired ? "text-amber-500" : "text-red-400";

    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: t.pageBg }}>
        <div className="max-w-lg rounded-xl border p-8 text-center shadow-sm" style={{ borderColor, background: bgColor }}>
          <AlertTriangle className="mx-auto mb-4" size={48} style={{ color: isRevoked ? "#ef4444" : isExpired ? "#f59e0b" : "#f87171" }} />
          <h1 className="mb-2 text-xl font-black" style={{ color: t.textPrimary }}>{title}</h1>
          <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>{subtitle}</p>
          {(isRevoked || isExpired) && (
            <p className="mt-4 text-xs" style={{ color: t.textMuted }}>
              Contact the link owner to generate a fresh share link from the IPC Command Center.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <BoardThemeContext.Provider value={t}>
    <div className="relative min-h-screen" style={{ background: t.pageGradient }}>
      {/* ── Crystal Lagoon Video Background ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover print:hidden"
        style={{ zIndex: 0, opacity: 0.12, pointerEvents: "none" }}
      >
        <source src="https://videos.pexels.com/video-files/1918465/1918465-uhd_2560_1440_24fps.mp4" type="video/mp4" />
      </video>
      <div className="relative" style={{ zIndex: 1 }}>
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* ── Premium Report Header ── */}
        <motion.header id="overview" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-2xl"
          style={{ background: t.headerBg, boxShadow: "0 4px 24px rgba(15,23,42,0.15), 0 1px 3px rgba(0,0,0,0.1)" }}
        >
          {/* Gradient mesh accents */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent" />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-center gap-5">
              <img src={t.logoSrc} alt="P.ZONE" className="hidden h-14 drop-shadow-lg md:block" />
              <img src="/logos/pzone-vertical-black.png" alt="P.ZONE" className="h-16 brightness-0 invert drop-shadow-lg md:hidden" />
              <div className="hidden h-12 w-px bg-white/20 md:block" />
              <div>
                <h1 className="text-xl font-black tracking-tight md:text-2xl" style={{ color: t.headerText }}>IPC Board Report</h1>
                <p className="text-[11px]" style={{ color: t.headerSubtext }}>Read-only executive snapshot — لوحة مشاركة تنفيذية</p>
                <p className="mt-0.5 text-[10px]" style={{ color: t.headerAccent }}>Developed By Eng AL Hassan A.Soliman</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest" style={{ color: t.headerAccent }}>Report Date</div>
                <div className="text-sm font-bold" style={{ color: t.headerText }}>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                {initialPage && initialPage !== "overview" && <div className="text-[10px]" style={{ color: t.headerAccent }}>Requested page: {initialPage}</div>}
              </div>
              <ThemeSwitcher current={themeMode} onChange={switchTheme} />
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/20 print:hidden"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Download size={16} />
                Export PDF
              </button>
            </div>
          </div>
          {/* Bottom gradient divider */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-400" />
        </motion.header>

        {/* ── Sticky Navigation ── */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8" style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}`, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["Overview", "#overview", Gauge],
              ["Trends", "#trends", TrendingUp],
              ["Risk", "#risk", AlertTriangle],
              ["Projects", "#projects", Target],
            ].map(([label, href, Icon]: any) => (
              <a
                key={label}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition-all duration-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
                style={{ background: t.navPillBg, border: `1px solid ${t.navPillBorder}`, color: t.navPillText }}
              >
                <Icon size={13} />
                {label}
              </a>
            ))}
            <div className="ml-auto hidden text-[11px] md:block" style={{ color: t.textSecondary }}>
              {stats.projectCount} projects / {stats.ipcCount} IPCs / {fmtMoney(stats.contractValue)} contract value
            </div>
          </div>
        </div>

        {/* ── Slicers ── */}
        <SharedBoardSlicers
          slicers={slicers}
          options={slicerOptions}
          activeCount={activeSlicerCount}
          filteredCount={invoices.length}
          totalCount={allInvoices.length}
          onChange={updateSlicer}
          onReset={() => {
            setSelectedProject(null);
            setDrillSource(null);
            setDrillLabel("");
            setSlicers(DEFAULT_SLICERS);
          }}
        />

        {/* ── Drill-Down Indicator ── */}
        <AnimatePresence>
          <DrillDownBanner source={drillSource} label={drillLabel} onClear={clearDrill} />
        </AnimatePresence>

        {invoices.length === 0 && (
          <div className="rounded-xl p-5" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}>
            <div className="text-sm font-bold" style={{ color: "#d97706" }}>No records match the selected slicers.</div>
            <div className="mt-1 text-xs" style={{ color: t.textSecondary }}>Reset filters or widen the month range to restore the shared dashboard data.</div>
          </div>
        )}

        {/* ── Executive Brief ── */}
        <ExecutiveBrief
          score={boardSignals.healthScore}
          collected={stats.collected}
          outstanding={stats.outstanding}
          unbilled={stats.unbilled}
          approvalRate={stats.approvalRate}
          collectionEfficiency={stats.collectionEfficiency}
          highestOutstanding={boardSignals.highestOutstanding}
          largestGap={boardSignals.largestGap}
        />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Building2} label="Projects" labelAr="المشاريع" value={String(stats.projectCount)} sub={`${stats.ipcCount} IPC records`} color="#7c3aed" delay={0} />
          <KPI icon={Shield} label="Contract Value" labelAr="قيمة العقود" value={fmtMoney(stats.contractValue)} color="#2563eb" delay={0.04} />
          <KPI icon={FileSpreadsheet} label="Submitted" labelAr="المقدم" value={fmtMoney(stats.submitted)} color="#2563eb" delay={0.08} />
          <KPI icon={Check} label="Approved" labelAr="المعتمد" value={fmtMoney(stats.approved)} color="#16a34a" delay={0.12} />
          <KPI icon={Wallet} label="Collected" labelAr="المحصل" value={fmtMoney(stats.collected)} color="#d97706" delay={0.16} />
          <KPI icon={Percent} label="Approval Rate" labelAr="نسبة الاعتماد" value={fmtPct(stats.approvalRate)} color={stats.approvalRate >= 0.8 ? "#16a34a" : "#dc2626"} delay={0.2} />
          <KPI icon={TrendingUp} label="Outstanding" labelAr="المتبقي" value={fmtMoney(stats.outstanding)} color="#dc2626" delay={0.24} />
          <KPI icon={Clock} label="Pending IPCs" labelAr="تحت الاعتماد" value={String(stats.pending)} color="#d97706" delay={0.28} />
        </div>

        {/* ── Charts Section ── */}
        {showCharts && (
        <>
        <ChartCard title="Payment Flow - مسار المستخلصات" icon={TrendingUp} color="#7c3aed" onReset={drillSource ? clearDrill : undefined}>
          <div className="space-y-3">
            {[
              ["Contract Value", stats.contractValue, "#2563eb"],
              ["Submitted", stats.submitted, "#2563eb"],
              ["Approved Net", stats.approvedNet, "#16a34a"],
              ["Collected", stats.collected, "#d97706"],
              ["Outstanding", stats.outstanding, "#dc2626"],
            ].map(([label, value, color], index) => {
              const pct = stats.contractValue > 0 ? (Number(value) / stats.contractValue) * 100 : 0;
              return (
                <div key={String(label)} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: t.textSecondary }}>{label}</span>
                    <span className="font-mono font-bold" style={{ color: t.textPrimary }}>{fmtFull(Number(value))} <span style={{ color: t.textMuted }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-8 overflow-hidden rounded-lg" style={{ background: t.slicerBg }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + index * 0.06 }}
                      className="flex h-full items-center justify-end rounded-lg pr-3"
                      style={{ background: `linear-gradient(90deg, ${color}55, ${color})` }}
                    >
                      <span className="text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard id="trends" title="Monthly Submitted vs Approved vs Collected - الاتجاه الشهري" icon={TrendingUp} color="#2563eb" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.key) {
                  const d = e.activePayload[0].payload;
                  drillDown("month", "monthFrom", d.key, d.month);
                  setSlicers((prev) => ({ ...prev, monthTo: d.key }));
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
                <XAxis dataKey="month" tick={{ fill: t.axisTick, fontSize: 11 }} style={{ cursor: "pointer" }} />
                <YAxis tick={{ fill: t.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#16a34a" strokeWidth={2} dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="#d97706" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="forecast" name="Forecast In" stroke="#0d9488" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px]" style={{ color: t.textMuted }}>Click any data point to drill-down by month</div>
          </ChartCard>

          <ChartCard title="Cash Position: Actual + Forecast - المركز النقدي الفعلي والمتوقع" icon={Wallet} color="#0d9488" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashPositionTrend} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.key) {
                  const d = e.activePayload[0].payload;
                  drillDown("month", "monthFrom", d.key, d.month);
                  setSlicers((prev) => ({ ...prev, monthTo: d.key }));
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
                <XAxis dataKey="month" tick={{ fill: t.axisTick, fontSize: 11 }} />
                <YAxis tick={{ fill: t.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="actualIn" name="Actual In" fill="#16a34a" radius={[5, 5, 0, 0]} cursor="pointer" />
                <Bar dataKey="actualOut" name="Actual Out" fill="#dc2626" radius={[5, 5, 0, 0]} cursor="pointer" />
                <Line type="monotone" dataKey="forecastIn" name="Forecast In" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="forecastOut" name="Forecast Out" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netForecast" name="Net Forecast" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sector Breakdown - القطاعات" icon={Building2} color="#7c3aed" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorData} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sector) {
                  drillDown("sector", "sector", e.activePayload[0].payload.sector, e.activePayload[0].payload.sector);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fill: t.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <YAxis type="category" dataKey="sector" tick={{ fill: t.axisTick, fontSize: 11 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="contractValue" name="Contract Value" radius={[0, 6, 6, 0]} cursor="pointer">
                  {sectorData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px]" style={{ color: t.textMuted }}>Click any bar to drill-down by sector</div>
          </ChartCard>

          <ChartCard title="Status Distribution - توزيع الحالات" icon={Check} color="#16a34a" onReset={drillSource ? clearDrill : undefined}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3}
                    onClick={(_, index) => {
                      const entry = statusData[index];
                      if (entry) {
                        const rawStatus = allInvoices.find((inv) => statusLabel(inv.status) === entry.name)?.status || entry.name;
                        drillDown("status", "status", rawStatus, entry.name);
                      }
                    }}
                    cursor="pointer"
                  >
                    {statusData.map((entry, index) => <Cell key={index} fill={statusColor(entry.name) || COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusData.map((entry) => {
                  const rawStatus = allInvoices.find((inv) => statusLabel(inv.status) === entry.name)?.status || entry.name;
                  return (
                    <button
                      key={entry.name}
                      onClick={() => drillDown("status", "status", rawStatus, entry.name)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-all hover:shadow-sm"
                      style={{ background: t.slicerBg, border: `1px solid ${t.cardBorder}` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(entry.name) }} />
                        <span style={{ color: t.textSecondary }}>{entry.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: t.textPrimary }}>{entry.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-center text-[10px]" style={{ color: t.textMuted }}>Click any slice or legend item to drill-down by status</div>
          </ChartCard>

          <ChartCard title="Collection by Client - التحصيل حسب العميل" icon={Wallet} color="#d97706" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={clientData} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.client) {
                  drillDown("client", "client", e.activePayload[0].payload.client, e.activePayload[0].payload.client);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fill: t.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <YAxis type="category" dataKey="client" tick={{ fill: t.axisTick, fontSize: 11 }} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="approved" name="Approved Net" fill="#16a34a88" radius={[0, 6, 6, 0]} cursor="pointer" />
                <Bar dataKey="collected" name="Collected" fill="#d97706" radius={[0, 6, 6, 0]} cursor="pointer" />
                <Bar dataKey="outstanding" name="Outstanding" fill="#dc262688" radius={[0, 6, 6, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center text-[10px]" style={{ color: t.textMuted }}>Click any bar to drill-down by client</div>
          </ChartCard>

          <ChartCard id="risk" title="Certified Analysis - تحليل المعتمد" subtitle="Gross, deductions, net, approved and collected movement" icon={FileSpreadsheet} color="#0891b2" onReset={drillSource ? clearDrill : undefined}>
            <div className="space-y-3">
              {waterfallData.map((item, index) => {
                const maxValue = Math.max(...waterfallData.map((row) => Math.abs(row.value)), 1);
                const pct = (Math.abs(item.value) / maxValue) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-right text-[10px] font-bold" style={{ color: t.textSecondary }}>{item.name}</div>
                    <div className="h-8 flex-1 overflow-hidden rounded-lg" style={{ background: t.slicerBg }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.06 }}
                        className="flex h-full items-center justify-end rounded-lg px-2"
                        style={{ background: `linear-gradient(90deg, ${item.fill}55, ${item.fill})` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.value < 0 ? "-" : ""}{fmtMoney(Math.abs(item.value))}</span>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Collection Aging - أعمار الديون" subtitle="Outstanding approved receivables by age bucket" icon={Clock} color="#d97706" onReset={drillSource ? clearDrill : undefined}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
                <XAxis dataKey="range" tick={{ fill: t.axisTick, fontSize: 11 }} />
                <YAxis tick={{ fill: t.axisTick, fontSize: 11 }} tickFormatter={(value) => fmtMoney(value)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>
                  {agingData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {delayData.length > 0 && (
          <ChartCard title="Payment Delay Tracker - متابعة تأخير الاعتماد" subtitle="Days from submitted date to approval date" icon={Clock} color="#ea580c" onReset={drillSource ? clearDrill : undefined}>
            <div className="space-y-2">
              {delayData.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate font-mono text-[10px]" style={{ color: t.textSecondary }}>{item.label}</div>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md" style={{ background: t.slicerBg }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.days / 120) * 100, 100)}%` }}
                      transition={{ duration: 0.5, delay: 0.15 + index * 0.03 }}
                      className="flex h-full items-center justify-end rounded-md pr-2"
                      style={{ background: `linear-gradient(90deg, ${item.color}44, ${item.color})` }}
                    >
                      <span className="text-[9px] font-bold text-white">{item.days}d</span>
                    </motion.div>
                    <div className="absolute bottom-0 top-0 w-px" style={{ left: `${(42 / 120) * 100}%`, background: t.textMuted }} />
                  </div>
                  <div className="w-20 text-right font-mono text-[10px]" style={{ color: t.textMuted }}>{fmtMoney(item.net)}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
        </>
        )}

        {/* ── Tables Section ── */}
        {showTables && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard id="projects" title="Top Projects - أكبر المشاريع" icon={Building2} color="#7c3aed" delay={0.3}>
            <div className="space-y-3">
              {projects.slice(0, 10).map((project, index) => {
                const collectionPct = project.approvedNet > 0 ? (project.collected / project.approvedNet) * 100 : 0;
                return (
                  <button
                    key={project.code}
                    onClick={() => setSelectedProject(project.code)}
                    className="group w-full rounded-lg p-3 text-left transition hover:shadow-sm"
                    style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${COLORS[index % COLORS.length]}14`, color: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold" style={{ color: t.textPrimary }}>{project.code}</span>
                          <span className="font-mono text-[10px]" style={{ color: t.textSecondary }}>{fmtMoney(project.contractValue)}</span>
                        </div>
                        <div className="truncate text-[10px]" style={{ color: t.textMuted }}>{project.name}</div>
                      </div>
                      <span style={{ color: t.textMuted }} className="transition group-hover:text-blue-500">›</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: t.slicerBg }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(collectionPct, 100)}%`, background: COLORS[index % COLORS.length] }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard title="Smart Alerts and Project Register - التنبيهات وسجل المشاريع" icon={AlertTriangle} color="#dc2626" delay={0.3}>
              <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {alerts.length === 0 ? (
                  <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>No critical alerts in this snapshot.</div>
                ) : alerts.slice(0, 4).map((alert, index) => (
                  <button
                    key={`${alert.project}-${index}`}
                    onClick={() => setSelectedProject(alert.project)}
                    className="rounded-lg border p-4 text-left transition hover:shadow-sm"
                    style={{
                      background: alert.type === "critical" ? "#fef2f2" : "#fffbeb",
                      borderColor: alert.type === "critical" ? "#fecaca" : "#fde68a",
                    }}
                  >
                    <div className="mb-1 text-xs font-bold" style={{ color: t.textPrimary }}>{alert.message}</div>
                    <div className="text-[10px]" style={{ color: t.textSecondary }}>Open project detail</div>
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-lg" style={{ border: `1px solid ${t.cardBorder}` }}>
                <div className="grid grid-cols-[1fr_1fr_110px_110px_110px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: t.tableHeaderBg, color: t.textSecondary }}>
                  <div>Project</div>
                  <div>Client</div>
                  <div className="text-right">Approved</div>
                  <div className="text-right">Collected</div>
                  <div className="text-right">Outstanding</div>
                </div>
                {projects.slice(0, 14).map((project) => {
                  const outstanding = Math.max(project.approvedNet - project.collected, 0);
                  return (
                    <button
                      key={project.code}
                      onClick={() => setSelectedProject(project.code)}
                      className="grid w-full grid-cols-[1fr_1fr_110px_110px_110px] px-3 py-2 text-left text-xs transition"
                      style={{ borderTop: `1px solid ${t.tableBorder}` }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold" style={{ color: t.textPrimary }}>{project.code}</div>
                        <div className="truncate text-[10px]" style={{ color: t.textMuted }}>{project.name}</div>
                      </div>
                      <div className="truncate" style={{ color: t.textSecondary }}>{project.client}</div>
                      <div className="text-right font-mono text-green-600">{fmtMoney(project.approvedNet)}</div>
                      <div className="text-right font-mono text-amber-600">{fmtMoney(project.collected)}</div>
                      <div className="text-right font-mono text-red-600">{fmtMoney(outstanding)}</div>
                    </button>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </div>
        )}

        {showTables && <ProjectPanel projectCode={selectedProject} invoices={invoices} onClose={() => setSelectedProject(null)} />}

        {/* ── Footer ── */}
        <footer className="-mx-6 -mb-6 mt-10 px-6 pb-6 pt-6 text-center lg:-mx-8 lg:-mb-8 lg:px-8" style={{ background: t.footerBg, borderTop: `1px solid ${t.dividerColor}` }}>
          <img src={t.logoFooterSrc} alt="P.ZONE" className="mx-auto mb-3 h-8 opacity-60" />
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            IPC Board Report — Read-only online snapshot — {new Date().toLocaleString("en-GB")}
          </p>
          <p className="mt-1.5 text-[10px] font-medium" style={{ color: t.headerAccent }}>Developed By Eng AL Hassan A.Soliman</p>
          <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </footer>
      </div>
      </div>{/* close z-index wrapper */}
    </div>
    </BoardThemeContext.Provider>
  );
}
