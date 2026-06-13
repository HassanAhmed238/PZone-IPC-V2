import { useEffect, useState } from "react";

export type ThemeMode = "light" | "grey" | "dark" | "dark-grey" | "baby-blue" | "golden" | "pzone";

const THEME_KEY = "theme";
const THEME_EVENT = "pzone-theme-change";

const VALID_MODES: ThemeMode[] = ["light", "grey", "dark", "dark-grey", "baby-blue", "golden", "pzone"];

function isThemeMode(value: string | null): value is ThemeMode {
  return VALID_MODES.includes(value as ThemeMode);
}

/** Which modes use a dark color scheme (for system dark-mode compat) */
const DARK_MODES: ThemeMode[] = ["dark", "dark-grey", "golden", "pzone"];

export function getThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isThemeMode(saved)) return saved;
  } catch {
    // Ignore blocked storage and keep the ERP's default dark look.
  }
  return "dark";
}

export function applyThemeMode(theme: ThemeMode): void {
  const root = document.documentElement;
  const isDark = DARK_MODES.includes(theme);
  root.classList.toggle("dark", isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = isDark ? "dark" : "light";

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme still applies for the current session.
  }

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    applyThemeMode(theme);
  }, []);

  useEffect(() => {
    const handleThemeEvent = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (isThemeMode(next)) setTheme(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY && isThemeMode(event.newValue)) {
        setTheme(event.newValue);
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    applyThemeMode(next);
    setTheme(next);
  };

  const toggleTheme = () => setMode(theme === "dark" ? "light" : "dark");

  return { theme, setTheme: setMode, toggleTheme, isDark: DARK_MODES.includes(theme) };
}
