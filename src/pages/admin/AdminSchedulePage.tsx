import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { useLoading } from "@/lib/loading";

import scheduleService from "@/gateway/services/scheduleService";
import { ArrowLeft, CalendarX2, Pencil, Plus, Trash2 } from "lucide-react";

export type BusinessHourItem = {
  weekday: number; // 0..6
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  active: boolean;
};

export type Block = {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

const weekdayLabel = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function fmtBlockRange(b: Block) {
  const start = new Date(b.startAt);
  const end = new Date(b.endAt);
  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} → ${end.toLocaleDateString()} ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function fmtBusinessHourView(h: BusinessHourItem) {
  if (!h.active) return "Fechado";
  return `${h.startTime} às ${h.endTime}`;
}

function normalizeTime(value: string): string | null {
  // remove espaços
  const v = value.trim();

  if (!v) return null;

  // aceita "15", "15:", "15:--", "15:0", "15:00" etc.
  const [hRaw, mRaw = "00"] = v.split(":");
  const hours = hRaw.replace(/\D/g, "");
  let minutes = mRaw.replace(/\D/g, "");

  if (hours === "") return null;

  // completa zeros à esquerda
  const hh = hours.padStart(2, "0").slice(0, 2);
  if (minutes === "") minutes = "00";
  const mm = minutes.padStart(2, "0").slice(0, 2);

  const result = `${hh}:${mm}`;

  // valida 24h corretamente
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // 00:00–23:59 [web:24]
  if (!timeRegex.test(result)) return null;

  return result;
}

export default function AdminSchedulePage() {
  const nav = useNavigate();
  const { show, hide } = useLoading();

  const [err, setErr] = useState<string | null>(null);

  const [hours, setHours] = useState<BusinessHourItem[]>([]);
  const [hoursConfigured, setHoursConfigured] = useState(false); // ✅ primeira vez
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    to.setDate(to.getDate() + 14);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);

  function askDeleteBlock(b: Block) {
    setErr(null);
    setBlockToDelete(b);
    setConfirmDeleteOpen(true);
  }

  // -------- modal EXPEDIENTE --------
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<BusinessHourItem[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // -------- modal BLOQUEIO --------
  const [openBlock, setOpenBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({
    startAt: "", // datetime-local
    endAt: "", // datetime-local
    reason: "",
  });
  // const [blockError, setBlockError] = useState<string | null>(null);

  // ✅ padrão: tudo DESATIVADO
  const defaultHours = useMemo<BusinessHourItem[]>(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        weekday: i,
        startTime: "09:00",
        endTime: "18:00",
        active: false,
      })),
    [],
  );

  const timeRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setTimeRef(key: string) {
    return (el: HTMLInputElement | null) => {
      timeRefs.current[key] = el;
    };
  }

  function validateHoursDraftUI(): boolean {
    for (const h of hoursDraft) {
      if (!h.active) continue;

      const startEl = timeRefs.current[`s-${h.weekday}`];
      const endEl = timeRefs.current[`e-${h.weekday}`];

      // limpa mensagens antigas
      startEl?.setCustomValidity("");
      endEl?.setCustomValidity("");

      const startOk = !!normalizeTime(h.startTime);
      const endOk = !!normalizeTime(h.endTime);

      if (!startOk) {
        startEl?.setCustomValidity("Informe um horário válido (HH:mm).");
        startEl?.reportValidity();
        return false;
      }
      if (!endOk) {
        endEl?.setCustomValidity("Informe um horário válido (HH:mm).");
        endEl?.reportValidity();
        return false;
      }
    }
    return true;
  }

  const startAtRef = useRef<HTMLInputElement | null>(null);
  const endAtRef = useRef<HTMLInputElement | null>(null);

  function clearBlockForm() {
    setErr(null);
    // setBlockError(null);
    setBlockForm({ startAt: "", endAt: "", reason: "" });
    startAtRef.current?.setCustomValidity("");
    endAtRef.current?.setCustomValidity("");
  }

  const blockRangeError = useMemo(
    () => validateBlockForm(blockForm.startAt, blockForm.endAt),
    [blockForm.startAt, blockForm.endAt],
  );

  useEffect(() => {
    // mostra erro de forma bem evidente (nativo do browser) quando tiver range inválido
    const msg = blockRangeError ?? "";
    if (startAtRef.current) startAtRef.current.setCustomValidity("");
    if (endAtRef.current) endAtRef.current.setCustomValidity(msg);

    // se já preencheu ambos e ficou inválido, dispara o “balãozinho” do navegador
    if (msg && blockForm.startAt && blockForm.endAt) {
      endAtRef.current?.reportValidity();
    }
  }, [blockRangeError, blockForm.startAt, blockForm.endAt]);

  async function loadAll(opts?: { showLoader?: boolean; label?: string }) {
    const showLoader = opts?.showLoader ?? true;
    const label = opts?.label ?? "Carregando horários...";

    setErr(null);
    setLoading(true);

    if (showLoader) show(label);

    try {
      const [h, b] = await Promise.all([
        scheduleService.listarHorarios(),
        scheduleService.listarBloqueios({ from: range.from, to: range.to }),
      ]);

      const configured = (h.data ?? []).length > 0;
      setHoursConfigured(configured);

      // ✅ se vier vazio, mostra o default (tudo fechado)
      setHours(configured ? h.data : defaultHours);
      setBlocks(b.data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      if (showLoader) hide();
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openHoursEditor() {
    setErr(null);
    setHoursDraft(hours.map((x) => ({ ...x })));
    setHoursOpen(true);
  }

  async function saveHoursFromModal() {
    setErr(null);

    const normalized = hoursDraft.map((h) => {
      if (!h.active) return h;

      const start = normalizeTime(h.startTime);
      const end = normalizeTime(h.endTime);

      if (!start || !end) {
        throw new Error(`Horário inválido em ${weekdayLabel[h.weekday]}`);
      }

      return { ...h, startTime: start, endTime: end };
    });

    setSavingHours(true);
    show("Salvando expediente...");

    try {
      await scheduleService.editarHorarios({ items: normalized });
      setHoursOpen(false);
      await loadAll({ showLoader: false });
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide();
      setSavingHours(false);
    }
  }

  function isValidDate(d: Date) {
    return !Number.isNaN(d.getTime());
  }

  function validateBlockForm(startAt: string, endAt: string): string | null {
    if (!startAt || !endAt) return null;

    const s = new Date(startAt);
    const e = new Date(endAt);

    if (!isValidDate(s) || !isValidDate(e))
      return "Datas inválidas. Use o seletor.";
    if (e <= s) return "O fim deve ser maior que o início.";
    return null;
  }

  const maxDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + 30); // 30 dias
    return max.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm formato datetime-local
  }, []);

  async function createBlock() {
    setErr(null);
    show("Criando bloqueio...");

    try {
      if (!blockForm.startAt || !blockForm.endAt) {
        throw new Error("Informe início e fim.");
      }

      const startDate = new Date(blockForm.startAt);
      const endDate = new Date(blockForm.endAt);

      const rangeMsg = validateBlockForm(blockForm.startAt, blockForm.endAt);
      if (rangeMsg) throw new Error(rangeMsg);

      // ✅ validação explícita
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Datas inválidas. Use o seletor de data/hora.");
      }
      if (endDate <= startDate) {
        throw new Error("Fim deve ser depois do início.");
      }
      if (endDate.getTime() - startDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw new Error("Bloqueio máximo de 7 dias.");
      }

      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      await scheduleService.criarBloqueios({
        startAt: startIso,
        endAt: endIso,
        reason: blockForm.reason.trim() === "" ? undefined : blockForm.reason,
      });

      setOpenBlock(false);
      setBlockForm({ startAt: "", endAt: "", reason: "" });
      await loadAll({ showLoader: false });
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide();
    }
  }

  async function confirmDeleteBlock() {
    if (!blockToDelete) return;

    setErr(null);
    setDeleting(true);
    show("Removendo bloqueio...");

    try {
      await scheduleService.deletarBloqueio(blockToDelete.id);
      setConfirmDeleteOpen(false);
      setBlockToDelete(null);
      await loadAll({ showLoader: false });
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide();
      setDeleting(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 border-b bg-background/95 backdrop-blur md:static md:mx-0 md:px-0 md:border-0">
        <div className="flex items-center justify-between gap-3">
          <div className="grid w-full grid-cols-3 items-center gap-3">
            {/* ESQUERDA */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hidden md:inline-flex"
                onClick={() => nav(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </div>

            {/* CENTRO */}
            <div className="min-w-0 text-center">
              <div className="font-semibold leading-none">Horários</div>
              <div className="text-xs text-muted-foreground">
                {loading ? "Carregando..." : "Expediente e bloqueios"}
              </div>
            </div>

            {/* DIREITA */}
            <div className="flex justify-end">
              <Button
                size="sm"
                className="rounded-full hidden md:inline-flex"
                onClick={openHoursEditor}
              >
                {hoursConfigured ? "Editar" : "Configurar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">
            {err}
          </CardContent>
        </Card>
      )}

      {/* EXPEDIENTE (somente visualização) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Expediente</h2>
            <p className="text-sm text-muted-foreground">
              {hoursConfigured
                ? "Visualize seus dias de atendimento"
                : "Você ainda não configurou seu expediente"}
            </p>
          </div>

          {/* ✅ somente “editar” quando já existir horários */}
          {hoursConfigured ? (
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={openHoursEditor}
            >
              <Pencil className="h-4 w-4" />
              Editar expediente
            </Button>
          ) : (
            <Button className="rounded-xl gap-2" onClick={openHoursEditor}>
              <Pencil className="h-4 w-4" />
              Configurar horários
            </Button>
          )}
        </div>

        {/* ✅ mensagem de primeira vez */}
        {!loading && !hoursConfigured && (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">Nenhum horário cadastrado</div>
                <div className="text-xs text-muted-foreground">
                  Configure pelo menos um dia e horário para liberar
                  agendamentos.
                </div>
              </div>

              <Button className="rounded-xl" onClick={openHoursEditor}>
                Configurar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* visualização (tudo fechado na primeira vez) */}
        <div className="space-y-3">
          {hours.map((h) => (
            <Card key={h.weekday} className="rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{weekdayLabel[h.weekday]}</div>

                  <Badge
                    variant="secondary"
                    className={[
                      "rounded-full",
                      h.active
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-zinc-500/15 text-zinc-700",
                    ].join(" ")}
                  >
                    {h.active ? "Ativo" : "Desativado"}
                  </Badge>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Horário: </span>
                  <span
                    className={
                      h.active ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {fmtBusinessHourView(h)}
                  </span>
                </div>

                {h.active && (
                  <div className="text-[11px] text-muted-foreground">
                    Início {h.startTime} • Fim {h.endTime}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* BLOQUEIOS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Bloqueios</h2>
            <p className="text-sm text-muted-foreground">
              Datas indisponíveis (feriados, etc.)
            </p>
          </div>

          {/* Mobile */}
          <Button
            size="icon"
            className="rounded-full shrink-0 sm:hidden"
            onClick={() => setOpenBlock(true)}
            aria-label="Novo bloqueio"
            title="Novo bloqueio"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Desktop/Tablet */}
          <Button className="hidden sm:inline-flex rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Novo bloqueio
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>De</Label>
                <Input
                  type="date"
                  value={range.from}
                  onChange={(e) =>
                    setRange((p) => ({ ...p, from: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={range.to}
                  onChange={(e) =>
                    setRange((p) => ({ ...p, to: e.target.value }))
                  }
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                void loadAll({
                  label: "Atualizando lista...",
                  showLoader: true,
                })
              }
            >
              Atualizar lista
            </Button>

            <Separator />

            {blocks.length === 0 ? (
              <div className="rounded-2xl border bg-muted/20 p-5 text-center">
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <CalendarX2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">
                  Nenhum bloqueio registrado
                </div>
                <div className="text-xs text-muted-foreground">
                  Toque no “+” para adicionar um novo
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border p-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {b.reason?.trim() ? b.reason : "Bloqueio"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtBlockRange(b)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => askDeleteBlock(b)}
                      aria-label="Remover bloqueio"
                      title="Remover"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* MODAL: CONFIGURAR/EDITAR EXPEDIENTE */}
      <Dialog
        open={hoursOpen}
        onOpenChange={(v) => {
          setHoursOpen(v);
          if (!v) setErr(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {hoursConfigured ? "Editar expediente" : "Configurar expediente"}
            </DialogTitle>
          </DialogHeader>

          {/* aviso geral */}
          <div className="mb-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Desativar um dia faz com que ele fique fechado para novos
            agendamentos. Agendamentos já existentes não são alterados.
          </div>

          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {hoursDraft.map((h, idx) => (
              <Card key={h.weekday} className="rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {weekdayLabel[h.weekday]}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {h.active ? "Dia ativo" : "Dia fechado"}
                      </span>
                      <Switch
                        checked={h.active}
                        onCheckedChange={(active) =>
                          setHoursDraft((p) =>
                            p.map((x, i) => (i === idx ? { ...x, active } : x)),
                          )
                        }
                        aria-label={`Dia ativo: ${weekdayLabel[h.weekday]}`}
                      />
                    </div>
                  </div>

                  {/* aviso específico quando o dia está desativado */}
                  {!h.active && (
                    <p className="text-[11px] text-muted-foreground">
                      Este dia ficará fechado e não aceitará novos agendamentos.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Início</Label>
                      <Input
                        ref={setTimeRef(`s-${h.weekday}`)}
                        type="time"
                        required={h.active}
                        value={h.startTime}
                        disabled={!h.active}
                        onChange={(e) =>
                          setHoursDraft((p) =>
                            p.map((x, i) =>
                              i === idx
                                ? { ...x, startTime: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Fim</Label>
                      <Input
                        ref={setTimeRef(`e-${h.weekday}`)}
                        type="time"
                        required={h.active}
                        value={h.endTime}
                        disabled={!h.active}
                        onChange={(e) =>
                          setHoursDraft((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, endTime: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHoursOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!validateHoursDraftUI()) return;
                void saveHoursFromModal();
              }}
              disabled={savingHours}
            >
              {savingHours ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO BLOQUEIO */}
      <Dialog
        open={openBlock}
        onOpenChange={(v) => {
          setOpenBlock(v);
          if (!v) setErr(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Novo bloqueio</DialogTitle>
          </DialogHeader>

          {blockRangeError && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-4 text-sm text-destructive">
                {blockRangeError}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Início</Label>
              <Input
                ref={startAtRef}
                type="datetime-local"
                value={blockForm.startAt}
                max={maxDate}
                aria-invalid={!!blockRangeError}
                className={
                  blockRangeError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                onChange={(e) => {
                  // setBlockError(null);
                  setBlockForm((p) => ({ ...p, startAt: e.target.value }));
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Fim</Label>
              <Input
                ref={endAtRef}
                type="datetime-local"
                value={blockForm.endAt}
                min={blockForm.startAt || undefined} // ajuda a prevenir
                max={maxDate}
                aria-invalid={!!blockRangeError}
                className={
                  blockRangeError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                onChange={(e) => {
                  // setBlockError(null);
                  setBlockForm((p) => ({ ...p, endAt: e.target.value }));
                }}
              />
              {blockRangeError && (
                <p className="text-xs text-destructive">{blockRangeError}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Motivo (opcional)</Label>
              <Input
                value={blockForm.reason}
                onChange={(e) =>
                  setBlockForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Feriado, almoço, manutenção..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearBlockForm} // ✅ limpa datas
            >
              Limpar
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenBlock(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void createBlock()}
                disabled={
                  !blockForm.startAt || !blockForm.endAt || !!blockRangeError
                }
                title={blockRangeError ?? undefined}
              >
                Criar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
              {blockToDelete
                ? ` Você está removendo: ${fmtBlockRange(blockToDelete)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // mantém o dialog aberto enquanto executa
                void confirmDeleteBlock();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
