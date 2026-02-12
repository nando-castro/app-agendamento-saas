import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { BookingLink, Service } from "../../lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useLoading } from "@/lib/loading"; // ✅ ADD

const SCHEDULE_ROUTE = "/admin/schedule";

// --------- horários ----------
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
// --------------------------------

// --------- links helpers ----------
function isLinkExpired(l: BookingLink) {
  const anyL = l as any;
  const expiresAt: string | null | undefined = anyL.expiresAt ?? anyL.expires_at ?? null;
  if (!expiresAt) return false;

  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) ? t <= Date.now() : false;
}

function getValidGeneralLink(links: BookingLink[]): BookingLink | null {
  const candidates = (links ?? [])
    .filter((l) => {
      const anyL = l as any;
      const hasServiceObj = !!anyL.service;
      const sid = anyL.serviceId ?? anyL.service_id ?? anyL.service?.id ?? null;
      const isGeneral = !hasServiceObj && !sid;
      return isGeneral && !isLinkExpired(l);
    })
    .sort((a, b) => {
      const anyA = a as any;
      const anyB = b as any;
      const ta = new Date(anyA.createdAt ?? anyA.created_at ?? 0).getTime();
      const tb = new Date(anyB.createdAt ?? anyB.created_at ?? 0).getTime();
      return tb - ta;
    });

  return candidates[0] ?? null;
}

function getValidLinkForService(links: BookingLink[], serviceId: string): BookingLink | null {
  const candidates = (links ?? [])
    .filter((l) => {
      const anyL = l as any;
      const sid = anyL.serviceId ?? anyL.service_id ?? anyL.service?.id ?? null;
      return sid === serviceId && !isLinkExpired(l);
    })
    .sort((a, b) => {
      const anyA = a as any;
      const anyB = b as any;
      const ta = new Date(anyA.createdAt ?? anyA.created_at ?? 0).getTime();
      const tb = new Date(anyB.createdAt ?? anyB.created_at ?? 0).getTime();
      return tb - ta;
    });

  return candidates[0] ?? null;
}
// --------------------------------

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const { show, hide } = useLoading(); // ✅ ADD

  const [services, setServices] = useState<Service[]>([]);
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [hoursReady, setHoursReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const hasActiveServices = useMemo(() => services.some((s) => !!s.active), [services]);

  const generalLink = useMemo(() => getValidGeneralLink(links), [links]);

  const canCreateGeneralLink = useMemo(() => {
    return hoursReady && hasActiveServices && !generalLink;
  }, [hoursReady, hasActiveServices, generalLink]);

  const canReactivateGeneralLink = useMemo(() => {
    return hoursReady && hasActiveServices && !!generalLink && !generalLink.active;
  }, [hoursReady, hasActiveServices, generalLink]);

  async function load(label = "Carregando painel...") {
    setErr(null);
    setLoading(true);
    show(label); // ✅ GLOBAL ON

    try {
      const [s, l, h] = await Promise.all([
        api.get<Service[]>("/services"),
        api.get<BookingLink[]>("/booking-links"),
        api.get<BusinessHourItem[]>("/schedule/business-hours"),
      ]);

      setServices(s.data);
      setLinks(l.data);

      const items = h.data ?? [];
      setHoursReady(hasValidBusinessHours(items));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha ao carregar.");
    } finally {
      hide(); // ✅ GLOBAL OFF
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleLink(id: string) {
    setErr(null);

    const link = links.find((x) => x.id === id);
    const activating = link ? !link.active : false;

    if (activating && !hoursReady) {
      setErr(
        "Não é possível ativar links sem um horário de funcionamento válido. Configure o expediente primeiro.",
      );
      return;
    }

    if (activating && link) {
      const anyL = link as any;
      const isGeneral = !anyL.service && !(anyL.serviceId ?? anyL.service_id);
      if (isGeneral && !hasActiveServices) {
        setErr("Para ativar o link geral, ative pelo menos 1 serviço.");
        return;
      }
    }

    setTogglingId(id);
    show("Atualizando link..."); // ✅ GLOBAL ON
    try {
      await api.patch(`/booking-links/${id}/toggle`);
      await load("Atualizando dados...");
    } finally {
      hide(); // ✅ GLOBAL OFF
      setTogglingId((cur) => (cur === id ? null : cur));
    }
  }

  async function createLink(serviceId?: string) {
    setErr(null);

    if (!hoursReady) {
      setErr(
        "Você precisa configurar um horário de funcionamento válido para gerar links de agendamento.",
      );
      return;
    }

    show(serviceId ? "Gerando link do serviço..." : "Gerando link geral..."); // ✅ GLOBAL ON
    try {
      // ---------- LINK GERAL ----------
      if (!serviceId) {
        if (!hasActiveServices) {
          setErr("Para gerar link geral, ative pelo menos 1 serviço.");
          return;
        }

        const existingGeneral = getValidGeneralLink(links);
        if (existingGeneral) {
          if (existingGeneral.active) {
            setErr("Já existe um link geral válido. Gerencie em “Links Públicos”.");
            return;
          }
          await toggleLink(existingGeneral.id);
          return;
        }

        await api.post("/booking-links", {});
        await load("Atualizando links...");
        return;
      }

      // ---------- LINK POR SERVIÇO ----------
      const svc = services.find((x) => x.id === serviceId);
      if (!svc) {
        setErr("Serviço não encontrado.");
        return;
      }
      if (!svc.active) {
        setErr("Para gerar link do serviço, ele precisa estar ATIVO.");
        return;
      }

      const existing = getValidLinkForService(links, serviceId);
      if (existing) {
        if (existing.active) {
          setErr("Esse serviço já possui um link válido. Gerencie em “Links Públicos”.");
          return;
        }
        await toggleLink(existing.id);
        return;
      }

      await api.post("/booking-links", { serviceId });
      await load("Atualizando links...");
    } finally {
      hide(); // ✅ GLOBAL OFF
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

  const generalButtonLabel = useMemo(() => {
    if (!generalLink) return "Gerar link geral";
    return generalLink.active ? "Link geral já criado" : "Reativar link geral";
  }, [generalLink]);

  return (
    <div className="w-full max-w-none space-y-6 overflow-x-hidden px-4 md:px-0">
      {err && <div className="text-sm text-rose-600">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {!hoursReady && (
            <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">Sem horários disponíveis</div>
                  <div className="text-xs text-muted-foreground">
                    Configure pelo menos 1 dia ativo com início e fim válidos
                    para liberar links de agendamento.
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

          {/* LINKS PÚBLICOS */}
          <section className="w-full space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Links Públicos</h2>
                <p className="text-sm text-muted-foreground">
                  Gere links gerais ou por serviço e ative/desative quando quiser.
                </p>

                {!hasActiveServices && (
                  <p className="mt-1 text-xs text-amber-600">
                    Para gerar/ativar link geral, é necessário ter ao menos 1 serviço ativo.
                  </p>
                )}

                {!hoursReady && (
                  <p className="mt-1 text-xs text-amber-600">
                    Para gerar/ativar links, é necessário configurar um expediente válido.
                  </p>
                )}

                {generalLink?.active && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link geral já existe (não expirado). Você pode desativar/ativar no card dele abaixo.
                  </p>
                )}
              </div>

              <Button
                onClick={() => {
                  if (generalLink && !generalLink.active) {
                    void toggleLink(generalLink.id);
                    return;
                  }
                  void createLink();
                }}
                disabled={
                  generalLink ? !canReactivateGeneralLink : !canCreateGeneralLink
                }
                className="rounded-full gap-2 w-full sm:w-auto"
                variant={generalLink && !generalLink.active ? "default" : "secondary"}
              >
                <Plus className="h-4 w-4" />
                {generalButtonLabel}
              </Button>
            </div>

            <div className="grid w-full gap-3">
              {links.map((l) => {
                const url = `${origin}/public/${l.token}`;
                const isActive = !!l.active;
                const isBusy = togglingId === l.id;

                const scopeLabel = l.service ? `Restrito: ${l.service.name}` : "Geral";

                const disableActivate = !hoursReady && !isActive;

                return (
                  <Card key={l.id} className="w-full rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                            Token
                          </div>
                          <div className="mt-1 font-mono text-sm truncate">{l.token}</div>

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

                            {!hoursReady && (
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-amber-500/15 text-amber-700"
                              >
                                Sem expediente
                              </Badge>
                            )}

                            {isLinkExpired(l) && (
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-zinc-500/15 text-zinc-700"
                              >
                                Expirado
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={isActive}
                            disabled={isBusy || disableActivate || isLinkExpired(l)}
                            onCheckedChange={() => void toggleLink(l.id)}
                            aria-label={isActive ? "Desativar link" : "Ativar link"}
                            title={
                              isLinkExpired(l)
                                ? "Link expirado (não reativável)"
                                : disableActivate
                                  ? "Configure horários para ativar links"
                                  : undefined
                            }
                          />
                        </div>
                      </div>

                      {isActive ? (
                        <>
                          <div className="flex w-full items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                                URL
                              </div>
                              <div className="font-mono text-xs break-all sm:truncate" title={url}>
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

                            <Button asChild variant="outline" size="icon" className="rounded-xl shrink-0">
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
                        </>
                      ) : (
                        <div className="rounded-2xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          Link oculto enquanto estiver inativo.
                        </div>
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
              {services.map((s) => {
                const existingLink = getValidLinkForService(links, s.id);

                const canGenerateServiceLink = !!s.active && hoursReady && !existingLink;
                const canReactivateServiceLink =
                  !!s.active && hoursReady && !!existingLink && !existingLink.active;

                const btnLabel = existingLink
                  ? existingLink.active
                    ? "Link já criado"
                    : "Reativar link"
                  : "Gerar link";

                return (
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

                          {!hoursReady && (
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-amber-500/15 text-amber-700"
                            >
                              Sem expediente
                            </Badge>
                          )}

                          {existingLink && !isLinkExpired(existingLink) && (
                            <Badge
                              variant="secondary"
                              className={[
                                "rounded-full",
                                existingLink.active
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-zinc-500/15 text-zinc-700",
                              ].join(" ")}
                            >
                              Link {existingLink.active ? "ativo" : "inativo"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        className="rounded-full shrink-0"
                        onClick={() => {
                          if (existingLink && !existingLink.active) {
                            void toggleLink(existingLink.id);
                            return;
                          }
                          void createLink(s.id);
                        }}
                        disabled={
                          existingLink ? !canReactivateServiceLink : !canGenerateServiceLink
                        }
                        variant={existingLink && !existingLink.active ? "default" : "secondary"}
                      >
                        {btnLabel}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

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
