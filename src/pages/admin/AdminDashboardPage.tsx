import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { BookingLink, Service } from "../../lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Plus } from "lucide-react";

export default function AdminDashboardPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api.get<Service[]>("/services"),
        api.get<BookingLink[]>("/booking-links"),
      ]);
      setServices(s.data);
      setLinks(l.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function createLink(serviceId?: string) {
    await api.post("/booking-links", serviceId ? { serviceId } : {});
    await load();
  }

  async function toggleLink(id: string) {
    setTogglingId(id);
    try {
      await api.patch(`/booking-links/${id}/toggle`);
      await load();
    } finally {
      setTogglingId((cur) => (cur === id ? null : cur));
    }
  }

  async function copyToClipboard(text: string, linkId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(linkId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === linkId ? null : current));
      }, 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);

      setCopiedId(linkId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === linkId ? null : current));
      }, 1200);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="w-full max-w-none space-y-6 overflow-x-hidden px-4 md:px-0">
      {err && <div className="text-sm text-rose-600">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* LINKS PÚBLICOS */}
          <section className="w-full space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Links Públicos</h2>
                <p className="text-sm text-muted-foreground">
                  Gere links gerais ou por serviço e ative/desative quando quiser.
                </p>
              </div>

              <Button
                onClick={() => void createLink()}
                className="rounded-full gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Gerar link geral
              </Button>
            </div>

            <div className="grid w-full gap-3">
              {links.map((l) => {
                const url = `${origin}/public/${l.token}`;
                const isActive = !!l.active;
                const isBusy = togglingId === l.id;

                const scopeLabel = l.service ? `Restrito: ${l.service.name}` : "Geral";

                return (
                  <Card key={l.id} className="w-full rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: token + switch */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                            Token
                          </div>
                          <div className="mt-1 font-mono text-sm truncate">
                            {l.token}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full">
                              {scopeLabel}
                            </Badge>

                            <Badge
                              variant="secondary"
                              className={[
                                "rounded-full",
                                isActive
                                  ? "bg-emerald-500/15 text-emerald-700"
                                  : "bg-rose-500/15 text-rose-700",
                              ].join(" ")}
                            >
                              {isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={isActive}
                            disabled={isBusy}
                            onCheckedChange={() => void toggleLink(l.id)}
                            aria-label={isActive ? "Desativar link" : "Ativar link"}
                          />
                        </div>
                      </div>

                      {/* URL row */}
                      <div className="flex w-full items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                            URL
                          </div>

                          {/* no mobile: quebra segura; no desktop: truncado */}
                          <div
                            className="font-mono text-xs break-all sm:truncate"
                            title={url}
                          >
                            {url}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl shrink-0"
                          onClick={() => void copyToClipboard(url, l.id)}
                          title="Copiar"
                          aria-label="Copiar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="rounded-xl shrink-0"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir"
                            aria-label="Abrir"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>

                      {copiedId === l.id && (
                        <div className="text-xs text-emerald-600">Copiado!</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {links.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhum link ainda.</div>
              )}
            </div>
          </section>

          {/* SERVIÇOS */}
          <section className="w-full space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">Serviços</h2>
            </div>

            <div className="grid w-full gap-3">
              {services.map((s) => (
                <Card key={s.id} className="w-full rounded-2xl">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.durationMinutes}min • R$ {(s.priceCents / 100).toFixed(2)}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={[
                            "rounded-full",
                            s.active
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "bg-rose-500/15 text-rose-700",
                          ].join(" ")}
                        >
                          {s.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      className="rounded-full shrink-0"
                      onClick={() => void createLink(s.id)}
                    >
                      Gerar link
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {services.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Crie serviços no backend primeiro.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
