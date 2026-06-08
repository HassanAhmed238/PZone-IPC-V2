import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeMode, getThemeMode } from "@/hooks/useThemeMode";

// Initialize theme before React paints to avoid a light/dark flash.
applyThemeMode(getThemeMode());

createRoot(document.getElementById("root")!).render(<App />);
