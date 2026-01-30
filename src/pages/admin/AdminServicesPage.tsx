import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type { Service } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const title = useMemo(() => (editing ? "Editar serviço" : "Novo serviço"), [editing]);

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
      signalPercentOverride: s.signalPercentOverride == null ? "" : String(s.signalPercentOverride),
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
        form.signalPercentOverride.trim() === "" ? null : Number(form.signalPercentOverride),
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Serviços</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie os serviços do salão.</p>
        </div>
        <Button onClick={openCreate}>Novo serviço</Button>
      </div>

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{err}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>{loading ? "Carregando..." : `${items.length} serviço(s)`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{s.name}</div>
                  {s.active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.durationMinutes}min • {money(s.priceCents)}
                  {s.signalPercentOverride != null ? ` • sinal: ${s.signalPercentOverride}%` : ""}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openEdit(s)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => void toggleActive(s)}>
                  {s.active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum serviço ainda.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Duração (min)</Label>
                <Input
                  inputMode="numeric"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Preço (centavos)</Label>
                <Input
                  inputMode="numeric"
                  value={form.priceCents}
                  onChange={(e) => setForm((p) => ({ ...p, priceCents: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Sinal (override % — opcional)</Label>
              <Input
                inputMode="numeric"
                value={form.signalPercentOverride}
                onChange={(e) => setForm((p) => ({ ...p, signalPercentOverride: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
