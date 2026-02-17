import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "custom";
const KEY = "theme:mode";

export function applyThemeMode(mode: ThemeMode) {
  // por enquanto: custom = dark (até você criar o editor de tokens do usuário)
  const effective = mode === "custom" ? "dark" : mode;

  document.documentElement.classList.toggle("dark", effective === "dark");
  localStorage.setItem(KEY, mode);
}

export function getThemeMode(): ThemeMode {
  const v = localStorage.getItem(KEY);
  return v === "dark" || v === "custom" ? (v as ThemeMode) : "light";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  const effective = mode === "custom" ? "dark" : mode;

  return (
    <button
      type="button"
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      {effective === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {effective === "dark" ? "Noturno" : "Claro"}
      </span>
    </button>
  );
}
