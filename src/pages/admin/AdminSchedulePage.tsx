import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type BusinessHourItem = {
  weekday: number; // 0..6
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  active: boolean;
};

type Block = {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

const weekdayLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminSchedulePage() {
  const [err, setErr] = useState<string | null>(null);

  const [hours, setHours] = useState<BusinessHourItem[]>([]);
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

  const [open, setOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    startAt: "",
    endAt: "",
    reason: "",
  });

  const defaultHours = useMemo<BusinessHourItem[]>(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        weekday: i,
        startTime: "09:00",
        endTime: "18:00",
        active: i >= 1 && i <= 5, // seg-sex
      })),
    []
  );

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [h, b] = await Promise.all([
        api.get<BusinessHourItem[]>("/schedule/business-hours"),
        api.get<Block[]>("/schedule/blocks", { params: { from: range.from, to: range.to } }),
      ]);

      setHours(h.data.length ? h.data : defaultHours);
      setBlocks(b.data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveHours() {
    setErr(null);
    try {
      // seu controller: setBusinessHours(req.tenantId, dto.items)
      // então payload precisa ser: { items: [...] }
      await api.put("/schedule/business-hours", { items: hours });
      await loadAll();
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  async function createBlock() {
    setErr(null);
    try {
      await api.post("/schedule/blocks", {
        startAt: blockForm.startAt,
        endAt: blockForm.endAt,
        reason: blockForm.reason || undefined,
      });
      setOpen(false);
      setBlockForm({ startAt: "", endAt: "", reason: "" });
      await loadAll();
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  async function deleteBlock(id: string) {
    setErr(null);
    try {
      await api.delete(`/schedule/blocks/${id}`);
      await loadAll();
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Horários e bloqueios</h1>
        <p className="text-sm text-muted-foreground">Define expediente e bloqueia períodos indisponíveis.</p>
      </div>

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{err}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expediente</CardTitle>
          <CardDescription>{loading ? "Carregando..." : "Configure por dia da semana"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hours.map((h, idx) => (
            <div key={h.weekday} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[80px_1fr_1fr_1fr] sm:items-center">
              <div className="font-medium">{weekdayLabel[h.weekday]}</div>

              <div className="flex items-center gap-2">
                <Label className="w-16">Ativo</Label>
                <input
                  type="checkbox"
                  checked={h.active}
                  onChange={(e) => {
                    const active = e.target.checked;
                    setHours((p) => p.map((x, i) => (i === idx ? { ...x, active } : x)));
                  }}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Início</Label>
                <Input
                  value={h.startTime}
                  onChange={(e) => setHours((p) => p.map((x, i) => (i === idx ? { ...x, startTime: e.target.value } : x)))}
                  placeholder="09:00"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Fim</Label>
                <Input
                  value={h.endTime}
                  onChange={(e) => setHours((p) => p.map((x, i) => (i === idx ? { ...x, endTime: e.target.value } : x)))}
                  placeholder="18:00"
                />
              </div>
            </div>
          ))}

          <Button onClick={() => void saveHours()}>Salvar horários</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Bloqueios</CardTitle>
            <CardDescription>Períodos indisponíveis (almoço, feriado, manutenção, etc.)</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>Novo bloqueio</Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>De</Label>
              <Input value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Até</Label>
              <Input value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
            </div>
          </div>

          <Button variant="outline" onClick={() => void loadAll()}>
            Atualizar lista
          </Button>

          <Separator />

          <div className="space-y-2">
            {blocks.map((b) => (
              <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <div className="font-medium">
                    {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">{b.reason ?? "Sem motivo"}</div>
                </div>
                <Button variant="destructive" onClick={() => void deleteBlock(b.id)}>
                  Remover
                </Button>
              </div>
            ))}
            {blocks.length === 0 && <div className="text-sm text-muted-foreground">Nenhum bloqueio no período.</div>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo bloqueio</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Início (ISO)</Label>
              <Input
                placeholder="2026-01-15T12:00:00"
                value={blockForm.startAt}
                onChange={(e) => setBlockForm((p) => ({ ...p, startAt: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Fim (ISO)</Label>
              <Input
                placeholder="2026-01-15T13:00:00"
                value={blockForm.endAt}
                onChange={(e) => setBlockForm((p) => ({ ...p, endAt: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Motivo (opcional)</Label>
              <Input
                value={blockForm.reason}
                onChange={(e) => setBlockForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => void createBlock()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
