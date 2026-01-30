import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type { Booking } from "@/lib/types";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function money(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export default function AdminBookingsPage() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    to.setDate(to.getDate() + 7);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  });

  const [items, setItems] = useState<Booking[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await api.get<Booking[]>("/bookings", {
        params: { from: range.from, to: range.to },
      });
      setItems(data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">Listagem de agendamentos por período.</p>
      </div>

      {err && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{err}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-1.5">
            <Label>De</Label>
            <Input value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Até</Label>
            <Input value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
          </div>
          <Button onClick={() => void load()} variant="outline">
            Buscar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>{loading ? "Carregando..." : `${items.length} agendamento(s)`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="rounded-lg border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{b.service.name}</div>
                    <Badge variant="secondary">{b.status}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
                  </div>

                  <div className="text-sm">
                    Cliente: <span className="font-medium">{b.customer.name}</span> • {b.customer.phone}
                  </div>
                </div>

                <div className="text-sm">
                  <div>
                    Total: <span className="font-medium">{money(b.totalPriceCents)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Sinal: {money(b.signalAmountCents)} • Código: <span className="font-mono">{b.code}</span>
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              {/* aqui depois entra: actions (cancelar, concluir, etc.) */}
              <div className="text-xs text-muted-foreground">Ações (cancelar/concluir) entram no próximo passo.</div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum agendamento no período.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
