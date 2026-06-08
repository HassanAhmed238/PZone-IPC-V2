import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "theme";
const THEME_EVENT = "pzone-theme-change";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

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
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

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

  return { theme, setTheme: setMode, toggleTheme };
}
