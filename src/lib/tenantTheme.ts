export type TenantTheme = {
  version: 1;
  mode: "light" | "dark" | "custom";
  vars: Record<string, string>;
};

export function applyCssVars(vars: Record<string, string> | undefined | null) {
  if (!vars) return;
  const root = document.documentElement;

  for (const [k, v] of Object.entries(vars)) {
    if (!k.startsWith("--")) continue;
    if (typeof v !== "string") continue;
    const val = v.trim();
    if (!val) continue;
    root.style.setProperty(k, val);
  }
}

export function clearCssVars(keys: string[]) {
  const root = document.documentElement;
  keys.forEach((k) => root.style.removeProperty(k));
}

export const ALLOWED_KEYS = ["--primary", "--ring", "--accent", "--sidebar-primary"];
