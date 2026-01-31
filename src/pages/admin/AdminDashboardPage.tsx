import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { clearAdminToken } from "../../lib/storage";
import type { BookingLink, Service } from "../../lib/types";

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
      }, 1500);
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
      }, 1500);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <button
            className="rounded-xl border px-3 py-2"
            onClick={() => {
              clearAdminToken();
              window.location.href = "/admin/login";
            }}
          >
            Sair
          </button>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {loading ? (
          <div className="text-sm text-zinc-600">Carregando...</div>
        ) : (
          <>
            <section className="rounded-2xl bg-white shadow p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Links Públicos</h2>
                <button
                  className="rounded-xl bg-zinc-900 text-white px-3 py-2"
                  onClick={() => void createLink()}
                >
                  Gerar link geral
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                {links.map((l) => {
                  const url = `${origin}/public/${l.token}`;
                  const isActive = !!l.active;
                  const isBusy = togglingId === l.id;

                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="text-sm min-w-0">
                        <div className="font-medium">
                          Token: <span className="font-mono">{l.token}</span>
                        </div>

                        <div className="text-zinc-600 flex items-center gap-2">
                          <span>
                            {l.service ? `Serviço: ${l.service.name}` : "Geral"}{" "}
                            •
                          </span>

                          <span
                            className={
                              isActive
                                ? "font-medium text-emerald-700"
                                : "font-medium text-rose-700"
                            }
                          >
                            {isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>

                        <div className="text-zinc-600 flex items-center gap-2 min-w-0">
                          <span>URL:</span>

                          <span className="font-mono truncate" title={url}>
                            {url}
                          </span>

                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => void copyToClipboard(url, l.id)}
                            aria-label="Copiar link"
                            title="Copiar link"
                          >
                            {copiedId === l.id ? "Copiado!" : "Copiar"}
                          </button>

                          <a
                            className="rounded-lg border px-2 py-1 text-xs"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir em nova guia"
                            title="Abrir em nova guia"
                          >
                            Abrir
                          </a>
                        </div>
                      </div>

                      <button
                        disabled={isBusy}
                        className={[
                          "shrink-0 rounded-xl px-3 py-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed",
                          isActive
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : "bg-emerald-600 text-white hover:bg-emerald-700",
                        ].join(" ")}
                        onClick={() => void toggleLink(l.id)}
                        title={isActive ? "Desativar link" : "Ativar link"}
                        aria-label={isActive ? "Desativar link" : "Ativar link"}
                      >
                        {isBusy
                          ? "Alterando..."
                          : isActive
                            ? "Desativar"
                            : "Ativar"}
                      </button>
                    </div>
                  );
                })}

                {links.length === 0 && (
                  <div className="text-sm text-zinc-600">
                    Nenhum link ainda.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white shadow p-4">
              <h2 className="font-semibold">Serviços</h2>
              <div className="mt-3 grid gap-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-zinc-600">
                        {s.durationMinutes}min • R${" "}
                        {(s.priceCents / 100).toFixed(2)}
                      </div>

                      <div className="flex items-center gap-2 text-zinc-600">
                        <span>Status:</span>
                        <span
                          className={
                            s.active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-rose-700"
                          }
                        >
                          {s.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <button
                      className="rounded-xl bg-zinc-900 text-white px-3 py-2"
                      onClick={() => void createLink(s.id)}
                    >
                      Gerar link deste serviço
                    </button>
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="text-sm text-zinc-600">
                    Crie serviços no backend primeiro.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
