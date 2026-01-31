import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type { Service } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Pencil, Plus, Power, SlidersHorizontal, X } from "lucide-react";

function money(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

type ServiceForm = {
  name: string;
  durationMinutes: string;
  priceCents: string;
  signalPercentOverride: string; // opcional
};

const emptyForm: ServiceForm = {
  name: "",
  durationMinutes: "30",
  priceCents: "0",
  signalPercentOverride: "",
};

type Filter = "all" | "active" | "inactive";

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  // filtro (estilo “Filtrar” do mock)
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const title = useMemo(
    () => (editing ? "Editar serviço" : "Novo serviço"),
    [editing]
  );

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await api.get<Service[]>("/services");
      setItems(data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
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
    setEditing(s);
    setForm({
      name: s.name,
      durationMinutes: String(s.durationMinutes),
      priceCents: String(s.priceCents),
      signalPercentOverride:
        s.signalPercentOverride == null ? "" : String(s.signalPercentOverride),
    });
    setOpen(true);
  }

  async function save() {
    setErr(null);

    const payload = {
      name: form.name.trim(),
      durationMinutes: Number(form.durationMinutes),
      priceCents: Number(form.priceCents),
      signalPercentOverride:
        form.signalPercentOverride.trim() === ""
          ? null
          : Number(form.signalPercentOverride),
    };

    try {
      if (!payload.name) throw new Error("Informe o nome do serviço.");
      if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0) {
        throw new Error("Duração inválida.");
      }
      if (!Number.isFinite(payload.priceCents) || payload.priceCents < 0) {
        throw new Error("Preço inválido.");
      }

      if (editing) {
        await api.patch(`/services/${editing.id}`, payload);
      } else {
        await api.post(`/services`, payload);
      }

      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  async function toggleActive(s: Service) {
    setErr(null);
    try {
      await api.patch(`/services/${s.id}`, { active: !s.active });
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  const activeCount = useMemo(
    () => items.filter((i) => !!i.active).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "active") return items.filter((i) => !!i.active);
    if (filter === "inactive") return items.filter((i) => !i.active);
    return items;
  }, [items, filter]);

  return (
    <div className="w-full space-y-4">
      {/* Header (mock style) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o que você oferece aos clientes
          </p>
        </div>

        {/* botão + (topo) */}
        <Button
          onClick={openCreate}
          size="icon"
          className="rounded-full shrink-0"
          aria-label="Novo serviço"
          title="Novo serviço"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* linha: “x serviços ativos” + Filtrar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${activeCount} serviço(s) ativo(s)`}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrar
        </Button>
      </div>

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{err}</CardContent>
        </Card>
      )}

      {/* Lista (cards) */}
      <div className="space-y-3">
        {filteredItems.map((s) => (
          <Card
            key={s.id}
            className={[
              "rounded-2xl",
              s.active ? "" : "bg-muted/30",
            ].join(" ")}
          >
            <CardContent className="p-4 space-y-3">
              {/* topo do card */}
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

              {/* ações */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => openEdit(s)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>

                <Button
                  variant={s.active ? "secondary" : "default"}
                  className={[
                    "rounded-xl gap-2",
                    s.active ? "text-rose-700" : "",
                  ].join(" ")}
                  onClick={() => void toggleActive(s)}
                >
                  <Power className="h-4 w-4" />
                  {s.active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && filteredItems.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Nenhum serviço encontrado.
          </div>
        )}
      </div>

      {/* CTA fixo no rodapé (só mobile) */}
      <div className="md:hidden fixed left-0 right-0 bottom-16 z-40 px-4">
        <Button
          onClick={openCreate}
          className="w-full rounded-2xl shadow-lg gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Dialog de filtro */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
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
      </Dialog>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Duração (min)</Label>
                <Input
                  inputMode="numeric"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, durationMinutes: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Preço (centavos)</Label>
                <Input
                  inputMode="numeric"
                  value={form.priceCents}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priceCents: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Sinal (override % — opcional)</Label>
              <Input
                inputMode="numeric"
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
            <Button onClick={() => void save()}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
