import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Global Number Formatting ─────────────────────────────
   Use these everywhere to display numbers like  3,556,254.35
   ──────────────────────────────────────────────────────────── */

/** Full number with commas: 3,556,254.35 */
export const fmtNum = (v: number | null | undefined, decimals = 2): string => {
  const n = Number(v ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** Compact: 3.6M, 556K, 1,234 */
export const fmtCompact = (v: number | null | undefined): string => {
  const n = Number(v ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  if (Math.abs(safe) >= 1e6) return (safe / 1e6).toFixed(1) + "M";
  if (Math.abs(safe) >= 1e3) return (safe / 1e3).toFixed(0) + "K";
  return safe.toFixed(0);
};

/** Percentage: 49.4% */
export const fmtPercent = (v: number | null | undefined): string =>
  ((Number.isFinite(Number(v ?? 0)) ? Number(v ?? 0) : 0) * 100).toFixed(1) + "%";
