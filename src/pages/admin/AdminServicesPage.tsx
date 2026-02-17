import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type { Service } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { useLoading } from "@/lib/loading";
import { Pencil, Plus, Power, SlidersHorizontal } from "lucide-react";

const SCHEDULE_ROUTE = "/admin/schedule"; // <- ajuste se necessário

// --------- horários (integração) ----------
type BusinessHourItem = {
  weekday: number; // 0..6
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  active: boolean;
};

function isValidHHmm(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t ?? "");
}
function hhmmToMinutes(t: string) {
  const [h, m] = (t ?? "00:00").split(":").map((x) => Number(x));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
function hasValidBusinessHours(items: BusinessHourItem[]) {
  return (items ?? []).some((i) => {
    if (!i.active) return false;
    if (!isValidHHmm(i.startTime) || !isValidHHmm(i.endTime)) return false;
    return hhmmToMinutes(i.startTime) < hhmmToMinutes(i.endTime);
  });
}
// -----------------------------------------

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function money(cents: number) {
  return brl.format((cents ?? 0) / 100);
}

function normalizeCentsDigits(input: string, maxDigits = 12) {
  const only = (input ?? "").replace(/\D/g, "").slice(0, maxDigits);
  const normalized = only.replace(/^0+/, "");
  return normalized === "" ? "0" : normalized;
}

function formatBRLFromCentsDigits(centsDigits: string) {
  const cents = Number(centsDigits || "0");
  return brl.format(cents / 100);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

type ServiceForm = {
  name: string;
  durationHours: string;
  durationMinutes: string;
  priceCents: string;
  signalPercentOverride: string;
  variableDuration: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  durationHours: "0",
  durationMinutes: "00",
  priceCents: "0",
  signalPercentOverride: "",
  variableDuration: false,
};

function onlyDigits(v: string, maxLen: number) {
  const d = (v ?? "").replace(/\D/g, "").slice(0, maxLen);
  return d === "" ? "0" : d;
}

function toInt(v: string) {
  const n = Number((v ?? "").replace(/\D/g, "") || "0");
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function normalizeMinute2(input: string) {
  const digits = (input ?? "").replace(/\D/g, "");
  const last2 = digits.slice(-2);
  return last2.padStart(2, "0");
}

function clampMinute2(min2: string) {
  const n = Number((min2 ?? "").replace(/\D/g, "") || "0");
  const m = Math.max(0, Math.min(59, Number.isFinite(n) ? n : 0));
  return pad2(Math.floor(m));
}

const durationPresets = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hora", minutes: 60 },
  { label: "1h 30", minutes: 90 },
  { label: "2 horas", minutes: 120 },
  { label: "3 horas", minutes: 180 },
];

type ServiceFilterKey = "active" | "inactive";

export default function AdminServicesPage() {
  const nav = useNavigate();
  const { show, hide } = useLoading();

  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ estado de horários
  const [hoursReady, setHoursReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  // const [filterOpen, setFilterOpen] = useState(false);
  // const [filter, setFilter] = useState<Filter>("all");


  const [serviceFilter, setServiceFilter] = useState<Set<ServiceFilterKey>>(
    () => new Set(["active", "inactive"]), // padrão: mostra tudo
  );

  const title = useMemo(
    () => (editing ? "Editar serviço" : "Novo serviço"),
    [editing],
  );

  async function load(opts?: { showLoader?: boolean; label?: string }) {
    const showLoader = opts?.showLoader ?? true;
    const label = opts?.label ?? "Carregando serviços...";

    setErr(null);
    setLoading(true);
    if (showLoader) show(label);

    try {
      const [sRes, hRes] = await Promise.all([
        api.get<Service[]>("/services"),
        api.get<BusinessHourItem[]>("/schedule/business-hours"),
      ]);

      setItems(sRes.data);

      // ✅ só “libera ativar” se existir ao menos 1 horário ativo e válido
      const ok = hasValidBusinessHours(hRes.data ?? []);
      setHoursReady(ok);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      if (showLoader) hide();
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(s: Service) {
    const total = Math.max(0, Math.floor(s.durationMinutes || 0));
    const hh = Math.floor(total / 60);
    const mm = total % 60;

    setEditing(s);
    setForm({
      name: s.name,
      durationHours: String(hh),
      durationMinutes: pad2(mm),
      priceCents: String(s.priceCents),
      signalPercentOverride:
        s.signalPercentOverride == null ? "" : String(s.signalPercentOverride),
      variableDuration: total === 0, // exemplo: 0 = variável
    });
    setOpen(true);
  }

  async function computeHoursReadyNow() {
    const { data } = await api.get<BusinessHourItem[]>(
      "/schedule/business-hours",
    );
    return hasValidBusinessHours(data ?? []);
  }

  async function save() {
    setErr(null);

    const hours = toInt(form.durationHours);
    const minutes = Number(clampMinute2(form.durationMinutes));
    const durationMinutes = form.variableDuration ? 0 : hours * 60 + minutes;

    const basePayload = {
      name: form.name.trim(),
      durationMinutes,
      priceCents: Number(form.priceCents),
      signalPercentOverride:
        form.signalPercentOverride.trim() === ""
          ? null
          : Number(form.signalPercentOverride),
    };

    show(editing ? "Salvando serviço..." : "Criando serviço...");

    try {
      if (!basePayload.name) throw new Error("Informe o nome do serviço.");

      if (!form.variableDuration) {
        if (
          !Number.isFinite(basePayload.durationMinutes) ||
          basePayload.durationMinutes <= 0
        ) {
          throw new Error(
            "Informe uma duração válida ou marque como duração variável.",
          );
        }
      }

      if (
        !Number.isFinite(basePayload.priceCents) ||
        basePayload.priceCents < 0
      ) {
        throw new Error("Preço inválido.");
      }

      if (editing) {
        await api.patch(`/services/${editing.id}`, basePayload);
      } else {
        const ok = await computeHoursReadyNow();
        await api.post(`/services`, {
          ...basePayload,
          active: ok ? true : false,
        });
      }

      setOpen(false);
      await load({ showLoader: false });
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide();
    }
  }

  async function toggleActive(s: Service) {
    setErr(null);

    // ✅ regra: só ativa se tiver horário configurado
    if (!s.active && !hoursReady) {
      setErr(
        "Para ativar um serviço, configure ao menos um horário de funcionamento (Expediente).",
      );
      return;
    }

    show(s.active ? "Desativando serviço..." : "Ativando serviço...");

    try {
      await api.patch(`/services/${s.id}`, { active: !s.active });
      await load({ showLoader: false });
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide();
    }
  }

  const activeCount = useMemo(
    () => items.filter((i) => !!i.active).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    // Se o usuário desmarcar tudo, mostra nada (intencional)
    return items.filter((s) => {
      if (s.active) return serviceFilter.has("active");
      return serviceFilter.has("inactive");
    });
  }, [items, serviceFilter]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o que você oferece aos clientes
          </p>
        </div>

        {/* Mobile */}
        <Button
          variant="default"
          onClick={openCreate}
          size="icon"
          className="rounded-full shrink-0 sm:hidden"
          aria-label="Novo serviço"
          title="Novo serviço"
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* Desktop/Tablet */}
        <Button
          variant="add"
          onClick={openCreate}
          className="hidden sm:inline-flex rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo serviço
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${activeCount} serviço(s) ativo(s)`}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Status do serviço</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={serviceFilter.has("active")}
              onCheckedChange={(checked) => {
                setServiceFilter((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add("active");
                  else next.delete("active");
                  return next;
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Ativos
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={serviceFilter.has("inactive")}
              onCheckedChange={(checked) => {
                setServiceFilter((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add("inactive");
                  else next.delete("inactive");
                  return next;
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Inativos
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setServiceFilter(new Set(["active", "inactive"]))}
            >
              Limpar filtro
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ✅ aviso quando horários não estão prontos */}
      {!loading && !hoursReady && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">Horários não configurados</div>
              <div className="text-xs text-muted-foreground">
                Você só consegue ativar serviços depois de cadastrar o
                expediente.
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => nav(SCHEDULE_ROUTE)}
            >
              Configurar horários
            </Button>
          </CardContent>
        </Card>
      )}

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">
            {err}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filteredItems.map((s) => {
          const canActivate = hoursReady;

          return (
            <Card
              key={s.id}
              className={["rounded-2xl", s.active ? "" : "bg-muted/30"].join(
                " ",
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {s.name.toUpperCase()}
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>⏱ {s.durationMinutes}min</span>
                      <span>•</span>
                      <span>💳 {money(s.priceCents)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="secondary"
                      className={[
                        "rounded-full",
                        s.active
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-zinc-500/15 text-zinc-700",
                      ].join(" ")}
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </Badge>

                    {s.signalPercentOverride != null && (
                      <div className="text-[11px] text-muted-foreground">
                        SINAL {s.signalPercentOverride}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="edit"
                    className="rounded-xl gap-2"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>

                  <Button
                    variant={s.active ? "secondary" : "success"}
                    className={[
                      "rounded-xl gap-2",
                      s.active ? "text-rose-700" : "",
                    ].join(" ")}
                    disabled={!s.active && !canActivate} // ✅ trava só na ativação
                    onClick={() => void toggleActive(s)}
                    title={
                      !s.active && !canActivate
                        ? "Configure horários para ativar"
                        : undefined
                    }
                  >
                    <Power className="h-4 w-4" />
                    {s.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && filteredItems.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Nenhum serviço encontrado.
          </div>
        )}
      </div>

      {/* Dialog filtro */}
      {/* <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtrar</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setFilter("active")}
            >
              Somente ativos
            </Button>
            <Button
              variant={filter === "inactive" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setFilter("inactive")}
            >
              Somente inativos
            </Button>

            <Button
              variant="ghost"
              className="justify-start text-muted-foreground gap-2"
              onClick={() => setFilter("all")}
            >
              <X className="h-4 w-4" />
              Limpar filtro
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Duração</Label>

              {/* Checkbox primeiro */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-2 mb-3">
                <Checkbox
                  id="variableDuration"
                  checked={form.variableDuration}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, variableDuration: !!checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded-md border-muted-foreground/40
                 data-[state=checked]:bg-emerald-600
                 data-[state=checked]:border-emerald-600
                 data-[state=checked]:text-emerald-50
                 data-[state=indeterminate]:bg-emerald-600"
                />

                <label
                  htmlFor="variableDuration"
                  className="space-y-0.5 cursor-pointer select-none"
                >
                  <div className="text-sm font-medium">Duração variável</div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Marque quando o tempo do atendimento pode variar de cliente
                    para cliente. O sistema não usará um horário fixo na agenda.
                  </p>
                </label>
              </div>

              {/* Select e inputs só aparecem se duração FIXA */}
              {!form.variableDuration && (
                <div className="space-y-3">
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                    value=""
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;

                      const hh = Math.floor(v / 60);
                      const mm = v % 60;

                      setForm((p) => ({
                        ...p,
                        variableDuration: false,
                        durationHours: String(hh),
                        durationMinutes: pad2(mm),
                      }));

                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="">Selecionar duração...</option>
                    {durationPresets.map((p) => (
                      <option key={p.minutes} value={p.minutes}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex w-full items-center justify-center gap-3">
                    <div className="grid gap-1 justify-items-center">
                      <Input
                        inputMode="numeric"
                        value={String(Number(form.durationHours || "0"))}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            durationHours: onlyDigits(e.target.value, 4),
                          }))
                        }
                        className="h-16 w-28 rounded-2xl text-center text-4xl font-semibold"
                        aria-label="Hora"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        Hora
                      </div>
                    </div>

                    <div className="text-3xl font-semibold text-muted-foreground leading-none">
                      :
                    </div>

                    <div className="grid gap-1 justify-items-center">
                      <Input
                        inputMode="numeric"
                        value={form.durationMinutes}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            durationMinutes: normalizeMinute2(e.target.value),
                          }))
                        }
                        onFocus={(e) => {
                          requestAnimationFrame(() => {
                            const len = e.target.value.length;
                            e.target.setSelectionRange(len, len);
                          });
                        }}
                        onClick={(e) => {
                          const el = e.currentTarget;
                          requestAnimationFrame(() => {
                            const len = el.value.length;
                            el.setSelectionRange(len, len);
                          });
                        }}
                        onBlur={() =>
                          setForm((p) => ({
                            ...p,
                            durationMinutes: clampMinute2(p.durationMinutes),
                          }))
                        }
                        className="h-16 w-28 rounded-2xl text-center text-4xl font-semibold bg-muted/60"
                        aria-label="Minuto"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        Minuto
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {form.variableDuration && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  A duração deste serviço pode variar de cliente para cliente. O
                  sistema não usará um tempo fixo ao agendar.
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Preço</Label>
              <Input
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={formatBRLFromCentsDigits(form.priceCents)}
                onChange={(e) => {
                  const digits = normalizeCentsDigits(e.target.value);
                  setForm((p) => ({ ...p, priceCents: digits }));
                }}
                onFocus={(e) => {
                  requestAnimationFrame(() => {
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  });
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="flex flex-col gap-0.5">
                Adiantamento na reserva (opcional)
                <span className="text-[11px] font-normal text-muted-foreground">
                  Informe o percentual cobrado antecipadamente para confirmar o
                  agendamento. Ex.: 50 = cobra 50% do valor do serviço.
                </span>
              </Label>
              <Input
                inputMode="numeric"
                placeholder="Percentual em % (ex.: 30)"
                value={form.signalPercentOverride}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    signalPercentOverride: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} variant="add">
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
