import { Button } from "@/components/ui/button";
import themeService from "@/gateway/services/themeService";
import { useLoading } from "@/lib/loading";
import { ALLOWED_KEYS, applyCssVars, clearCssVars } from "@/lib/tenantTheme";
import { useEffect, useMemo, useState } from "react";

function ColorField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{props.label}</div>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="h-10 w-14 rounded-md border border-border bg-background p-1"
          aria-label={props.label}
        />

        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/40"
          placeholder="#6366f1"
        />
      </div>

      {props.hint && (
        <div className="text-xs text-muted-foreground">{props.hint}</div>
      )}
    </div>
  );
}

const DEFAULTS = {
  primary: "#6366F1",
  ring: "#6366F1",
  accent: "#22C55E",
  sidebarPrimary: "#6366F1",
};

export default function AppearancePage() {
  const { show, hide } = useLoading();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // states do form
  const [primary, setPrimary] = useState(DEFAULTS.primary);
  const [ring, setRing] = useState(DEFAULTS.ring);
  const [accent, setAccent] = useState(DEFAULTS.accent);
  const [sidebarPrimary, setSidebarPrimary] = useState(DEFAULTS.sidebarPrimary);

  const vars = useMemo(
    () => ({
      "--primary": primary,
      "--ring": ring,
      "--accent": accent,
      "--sidebar-primary": sidebarPrimary,
    }),
    [primary, ring, accent, sidebarPrimary],
  );

  // preview ao vivo
  useEffect(() => {
    applyCssVars(vars);
  }, [vars]);

  // load inicial do backend
  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(null);
      setLoading(true);
      show("Carregando aparência...");

      try {
        const { data } = await themeService.listar();

        // aplica vars do tenant
        const v = data?.vars ?? {};
        if (alive) {
          setPrimary((v["--primary"] as string) ?? DEFAULTS.primary);
          setRing((v["--ring"] as string) ?? DEFAULTS.ring);
          setAccent((v["--accent"] as string) ?? DEFAULTS.accent);
          setSidebarPrimary(
            (v["--sidebar-primary"] as string) ?? DEFAULTS.sidebarPrimary,
          );
        }
      } catch (e: any) {
        if (alive)
          setErr(e?.response?.data?.message ?? "Falha ao carregar aparência.");
      } finally {
        hide();
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    setErr(null);
    show("Salvando tema...");

    try {
      await themeService.atualizar({
        mode: "custom",
        vars,
      });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha ao salvar tema.");
    } finally {
      hide();
    }
  }

  async function onReset() {
    setErr(null);
    show("Resetando tema...");

    try {
      await themeService.resetar();
      clearCssVars(ALLOWED_KEYS);

      setPrimary(DEFAULTS.primary);
      setRing(DEFAULTS.ring);
      setAccent(DEFAULTS.accent);
      setSidebarPrimary(DEFAULTS.sidebarPrimary);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha ao resetar tema.");
    } finally {
      hide();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Aparência</div>
        <div className="text-sm text-muted-foreground">
          Escolha algumas cores para personalizar o painel. As alterações
          aparecem em tempo real.
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-5">
          <ColorField
            label="Cor primária (botões/links)"
            value={primary}
            onChange={setPrimary}
            hint="Afecta: botões principais, destaques e links."
          />
          <ColorField
            label="Cor do anel (focus)"
            value={ring}
            onChange={setRing}
            hint="Afecta: outline/focus dos inputs e botões."
          />
          <ColorField
            label="Cor de destaque (accent)"
            value={accent}
            onChange={setAccent}
            hint="Afecta: badges/realces e alguns componentes."
          />
          <ColorField
            label="Sidebar primária"
            value={sidebarPrimary}
            onChange={setSidebarPrimary}
            hint="Afecta: itens ativos/destaques na sidebar."
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="text-sm font-medium">Prévia rápida</div>

          <div className="flex flex-wrap gap-2">
            <Button>Botão primário</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destrutivo</Button>
          </div>

          <div className="grid gap-3">
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/40"
              placeholder="Input com focus…"
            />
            <div className="text-sm text-muted-foreground">
              Clique no input pra ver o ring/focus.
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={onSave} className="flex-1" disabled={loading}>
              Salvar tema
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={loading}
            >
              Resetar
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Agora salva no backend (por tenant). Se você abrir em outro
            navegador, vem igual.
          </div>
        </div>
      </div>
    </div>
  );
}
