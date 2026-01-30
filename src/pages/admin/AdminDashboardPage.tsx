import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { clearAdminToken } from '../../lib/storage';
import type { BookingLink, Service } from '../../lib/types';

export default function AdminDashboardPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = useMemo(() => {
    // evita crash se algum dia isso rodar em SSR
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api.get<Service[]>('/services'),
        api.get<BookingLink[]>('/booking-links'),
      ]);
      setServices(s.data);
      setLinks(l.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }

  async function createLink(serviceId?: string) {
    await api.post('/booking-links', serviceId ? { serviceId } : {});
    await load();
  }

  async function toggleLink(id: string) {
    await api.patch(`/booking-links/${id}/toggle`);
    await load();
  }

  async function copyToClipboard(text: string, linkId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(linkId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === linkId ? null : current));
      }, 1500);
    } catch {
      // fallback: seleciona e copia (menos elegante, mas funciona em alguns casos)
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
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
              window.location.href = '/admin/login';
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

                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="text-sm min-w-0">
                        <div className="font-medium">
                          Token: <span className="font-mono">{l.token}</span>
                        </div>

                        <div className="text-zinc-600">
                          {l.service ? `Restrito: ${l.service.name}` : 'Geral'}
                          {' • '}
                          {l.active ? 'Ativo' : 'Inativo'}
                        </div>

                        <div className="text-zinc-600 flex items-center gap-2 min-w-0">
                          <span>URL:</span>

                          <span
                            className="font-mono truncate"
                            title={url}
                          >
                            {url}
                          </span>

                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => void copyToClipboard(url, l.id)}
                            aria-label="Copiar link"
                            title="Copiar link"
                          >
                            {copiedId === l.id ? 'Copiado!' : 'Copiar'}
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
                        className="shrink-0 rounded-xl border px-3 py-2"
                        onClick={() => void toggleLink(l.id)}
                      >
                        Toggle
                      </button>
                    </div>
                  );
                })}

                {links.length === 0 && (
                  <div className="text-sm text-zinc-600">Nenhum link ainda.</div>
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
                        {s.durationMinutes}min • R$ {(s.priceCents / 100).toFixed(2)}
                      </div>
                      <div className="text-zinc-600">{s.active ? 'Ativo' : 'Inativo'}</div>
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
