export type ThemeMode = "light" | "dark";

export type TenantTheme = {
  mode?: ThemeMode;
  // tokens CSS vars (valores devem ser string válida de CSS, ex: "oklch(...)" ou "#rrggbb")
  admin?: Record<string, string>;
  public?: Record<string, string>;
};

const MODE_KEY = "theme:mode";

export function setMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(MODE_KEY, mode);
}

export function getMode(): ThemeMode {
  const v = localStorage.getItem(MODE_KEY);
  return v === "dark" ? "dark" : "light";
}

export function applyCssVars(vars: Record<string, string> | undefined) {
  if (!vars) return;
  const root = document.documentElement;

  for (const [k, v] of Object.entries(vars)) {
    // aceitar "primary" ou "--primary"
    const key = k.startsWith("--") ? k : `--${k}`;
    root.style.setProperty(key, v);
  }
}

export function clearCssVars(keys: string[]) {
  const root = document.documentElement;
  keys.forEach((k) => {
    const key = k.startsWith("--") ? k : `--${k}`;
    root.style.removeProperty(key);
  });
}

/**
 * Aplica tema do tenant.
 * - scope = "admin" para painel
 * - scope = "public" para a tela de agendamento
 */
export function applyTenantTheme(theme: TenantTheme | null | undefined, scope: "admin" | "public") {
  if (!theme) return;

  // modo: tenant pode sugerir, mas você pode decidir priorizar preferência do usuário
  if (theme.mode) setMode(theme.mode);

  applyCssVars(scope === "admin" ? theme.admin : theme.public);
}
