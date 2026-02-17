import { getErrorMessage } from "@/lib/getErrorMessage";
import type { Booking } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import bookingService from "@/gateway/services/bookingsService";
import { useLoading } from "@/lib/loading";
import { CalendarDays, Filter, Phone, Search, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function money(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

type BookingStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "PENDING_PAYMENT";

function statusLabel(status: string) {
  const s = String(status || "").toUpperCase();
  if (s.includes("CONFIRM")) return { text: "CONFIRMADO", kind: "ok" as const };
  if (s.includes("CANCEL")) return { text: "CANCELADO", kind: "bad" as const };
  if (s.includes("PEND")) return { text: "PENDENTE", kind: "warn" as const };
  if (s.includes("CONCLU"))
    return { text: "CONCLUÍDO", kind: "neutral" as const };
  return { text: s || "STATUS", kind: "neutral" as const };
}

function badgeClass(kind: "ok" | "warn" | "bad" | "neutral") {
  if (kind === "ok") return "bg-emerald-500/15 text-emerald-700 rounded-full";
  if (kind === "warn") return "bg-amber-500/15 text-amber-800 rounded-full";
  if (kind === "bad") return "bg-rose-500/15 text-rose-700 rounded-full";
  return "bg-zinc-500/15 text-zinc-700 rounded-full";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminBookingsPage() {
  const { show, hide } = useLoading();

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    to.setDate(to.getDate() + 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  });

  const [items, setItems] = useState<Booking[]>([]);

  const statusOptions: { value: BookingStatus; label: string }[] = [
    { value: "CONFIRMED", label: "Confirmado" },
    { value: "PENDING_PAYMENT", label: "Pendente" },
    { value: "COMPLETED", label: "Concluído" },
    { value: "CANCELLED", label: "Cancelado" },
    { value: "EXPIRED", label: "Expirado" },
  ];

  const [statusFilter, setStatusFilter] = useState<Set<BookingStatus>>(
    () => new Set(),
  );

  const filteredItems = useMemo(() => {
    if (statusFilter.size === 0) return items; // sem filtro => tudo
    return items.filter((b) =>
      statusFilter.has(
        String((b as any).status).toUpperCase() as BookingStatus,
      ),
    );
  }, [items, statusFilter]);

  async function load(label = "Carregando agendamentos...") {
    setErr(null);
    setLoading(true);
    show(label); // ✅ GLOBAL LOADER ON

    try {
      const { data } = await bookingService.listarBookings({
        from: range.from,
        to: range.to,
      });
      setItems(data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      hide(); // ✅ GLOBAL LOADER OFF
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultsLabel = useMemo(() => {
    if (loading) return "Carregando...";
    return `RESULTADOS (${filteredItems.length})`;
  }, [loading, filteredItems.length]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus horários
          </p>
        </div>

        {/* <Button
          size="icon"
          variant="outline"
          className="rounded-full shrink-0"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
        </Button> */}
      </div>

      {err && (
        <Card className="border-destructive/40 rounded-2xl">
          <CardContent className="pt-4 text-sm text-destructive">
            {err}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                De
              </div>
              <div className="relative">
                <CalendarDays className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setRange((p) => {
                      const newTo = p.to && p.to < newFrom ? newFrom : p.to; // YYYY-MM-DD compara OK
                      return { ...p, from: newFrom, to: newTo };
                    });
                  }}
                  className="pl-10 rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Até
              </div>
              <div className="relative">
                <CalendarDays className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={(e) =>
                    setRange((p) => ({ ...p, to: e.target.value }))
                  }
                  className="pl-10 rounded-2xl"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => void load("Buscando agendamentos...")}
            className="w-full rounded-2xl gap-2"
            variant="search"
            disabled={loading} // opcional
          >
            <Search className="h-4 w-4" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground tracking-widest uppercase">
          {resultsLabel}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              Filtrar
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {statusOptions.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={statusFilter.has(opt.value)}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(opt.value);
                    else next.delete(opt.value);
                    return next;
                  });
                }}
                onSelect={(e) => e.preventDefault()} // evita fechar ao clicar no item
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setStatusFilter(new Set())}
            >
              Limpar filtros
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filteredItems.map((b) => {
          const st = statusLabel(String((b as any).status));
          const serviceName = b.service?.name ?? "Serviço";
          const customerName = b.customer?.name ?? "Cliente";
          const customerPhone = b.customer?.phone ?? "";
          const total = money(b.totalPriceCents);
          const signal = money(b.signalAmountCents);

          return (
            <Card key={b.id} className="rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={badgeClass(st.kind)}
                      >
                        {st.text}
                      </Badge>
                    </div>

                    <div className="mt-1 font-semibold truncate">
                      {serviceName.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold">{total}</div>
                    <div className="text-xs text-muted-foreground">
                      Sinal: {signal}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {fmtDate(b.startAt)}, {fmtTime(b.startAt)} —{" "}
                      {fmtTime(b.endAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{customerName}</span>
                  </div>

                  {customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{customerPhone}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground min-w-0">
                    <span className="uppercase tracking-widest">ID:</span>{" "}
                    <span className="font-mono truncate">
                      {(b as any).code ?? b.id}
                    </span>
                  </div>

                  <Button size="sm" className="rounded-full">
                    Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && filteredItems.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Nenhum agendamento no período.
          </div>
        )}
      </div>
    </div>
  );
}
