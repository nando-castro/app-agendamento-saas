export type UserTheme = {
  // cores em string CSS: pode ser "oklch(...)" ou "#RRGGBB"
  primary?: string;
  ring?: string;
  accent?: string;
  sidebarPrimary?: string;
};

const KEY = "theme:user:vars";

function toCssVarMap(t: UserTheme): Record<string, string | undefined> {
  return {
    "--primary": t.primary,
    "--ring": t.ring,
    "--accent": t.accent,
    "--sidebar-primary": t.sidebarPrimary,
  };
}

export function loadUserTheme(): UserTheme | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserTheme;
  } catch {
    return null;
  }
}

export function saveUserTheme(theme: UserTheme) {
  localStorage.setItem(KEY, JSON.stringify(theme));
}

export function clearUserTheme() {
  localStorage.removeItem(KEY);
  // também remove do DOM
  const root = document.documentElement;
  ["--primary", "--ring", "--accent", "--sidebar-primary"].forEach((k) =>
    root.style.removeProperty(k),
  );
}

export function applyUserTheme(theme: UserTheme | null) {
  if (!theme) return;
  const root = document.documentElement;
  const vars = toCssVarMap(theme);
  Object.entries(vars).forEach(([k, v]) => {
    if (!v) return;
    root.style.setProperty(k, v);
  });
}
