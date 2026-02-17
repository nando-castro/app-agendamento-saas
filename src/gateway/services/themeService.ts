import { api } from "@/lib/api";

export type TenantTheme = {
  version: 1;
  mode: "light" | "dark" | "custom";
  vars: Record<string, string>;
};

export type UpdateTenantThemePayload = {
  mode?: "light" | "dark" | "custom";
  vars?: Record<string, string>;
};

const themeService = {
  listar: () => api.get<TenantTheme>("/theme"),
  atualizar: (payload: UpdateTenantThemePayload) =>
    api.patch<TenantTheme>("/theme", payload),
  resetar: () => api.delete<TenantTheme>("/theme"),
};

export default themeService;
