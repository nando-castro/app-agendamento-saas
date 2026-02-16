import { useLoading } from "@/lib/loading";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { publicApi } from "../../lib/api";
import type { AvailabilityResponse, Booking, Service } from "../../lib/types";

function formatMoney(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

type PixPayment = {
  paymentId: string;
  mpPaymentId?: string | null;
  status: string; // pending | approved | rejected | cancelled ...
  statusDetail?: string | null;
  expiresAt?: string | null;
  qrCode?: string | null; // copia e cola
  qrCodeBase64?: string | null; // imagem
  ticketUrl?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function msToMMSS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

export default function PublicBookingPage() {
  const { token } = useParams<{ token: string }>();
  const { show, hide } = useLoading();

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [selectedStartAt, setSelectedStartAt] = useState<string>("");

  const [created, setCreated] = useState<Booking | null>(null);

  // PIX/payment
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [pixErr, setPixErr] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // countdown
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const base = useMemo(() => `/public/links/${token}`, [token]);
  const selectedService = services.find((s) => s.id === serviceId);

  const pollRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  async function loadServices() {
    if (!token) return;
    setErr(null);
    setLoading(true);
    show("Carregando serviços...");

    try {
      const { data } = await publicApi.get<Service[]>(`${base}/services`);
      setServices(data);
      if (data[0]) setServiceId(data[0].id);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha ao carregar serviços.");
    } finally {
      hide();
      setLoading(false);
    }
  }

  async function loadAvailability(opts?: {
    resetFlow?: boolean;
    showLoader?: boolean;
  }) {
    if (!token || !serviceId) return;

    const resetFlow = opts?.resetFlow ?? true;
    const showLoader = opts?.showLoader ?? true;

    setErr(null);

    // ✅ só reseta o fluxo quando trocou data/serviço (ou você quiser)
    if (resetFlow) {
      setCreated(null);
      setPix(null);
      setPixErr(null);
      setSelectedStartAt("");
    }

    if (showLoader) show("Carregando horários...");

    try {
      const { data } = await publicApi.get<AvailabilityResponse>(
        `${base}/availability`,
        {
          params: { serviceId, date },
        },
      );
      setAvailability(data);
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ?? "Falha ao carregar disponibilidade.",
      );
    } finally {
      if (showLoader) hide();
    }
  }

  // Sugestão: GET /public/links/:token/bookings/:bookingId
  async function loadBooking(bookingId: string) {
    const { data } = await publicApi.get<Booking>(
      `${base}/bookings/${bookingId}`,
    );
    return data;
  }

  async function createPixPayment(bookingId: string, payerEmail?: string) {
    const payload = {
      bookingId,
      payerEmail: payerEmail || undefined,
      intent: "SIGNAL", // ou "TOTAL"
    };
    const { data } = await publicApi.post<PixPayment>(`/payments/pix`, payload);
    return data;
  }

  async function loadMpPaymentStatus(mpPaymentId: string) {
    const { data } = await publicApi.get<any>(`/payments/${mpPaymentId}`);
    return data; // deve conter "status"
  }

  async function cancelBooking(bookingId: string) {
    await publicApi.post(`${base}/bookings/${bookingId}/cancel`);
  }

  async function createBooking() {
    if (!token || !serviceId || !selectedStartAt) return;

    if (!customer.email.trim()) {
      setErr("Informe um email para gerar o PIX.");
      return;
    }

    setErr(null);
    setPixErr(null);
    setPix(null);
    setPixLoading(true);

    show("Criando reserva e gerando PIX...");

    let bookingCreated: Booking | null = null;

    try {
      const payload = {
        serviceId,
        startAt: selectedStartAt,
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim(),
        },
      };

      const { data: booking } = await publicApi.post<Booking>(
        `${base}/bookings`,
        payload,
      );
      bookingCreated = booking;

      const pixPayment = await createPixPayment(
        booking.id,
        customer.email.trim(),
      );

      setCreated(booking);
      setPix(pixPayment);
    } catch (e: any) {
      if (bookingCreated) {
        try {
          await cancelBooking(bookingCreated.id);
        } catch {}
      }
      setErr(
        e?.response?.data?.message ??
          e?.message ??
          "Falha ao gerar PIX. Não foi possível reservar.",
      );
      setCreated(null);
      setPix(null);
    } finally {
      hide();
      setPixLoading(false);
    }
  }

  async function startPixFlow(booking: Booking, payerEmail?: string) {
    setPixErr(null);
    setPixLoading(true);
    show("Gerando PIX...");

    try {
      const payment = await createPixPayment(booking.id, payerEmail);
      setPix(payment);
    } catch (e: any) {
      setPixErr(e?.response?.data?.message ?? "Falha ao gerar PIX.");
    } finally {
      hide();
      setPixLoading(false);
    }
  }

  function clearPollers() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  // ✅ permanece na tela de pagamento enquanto existir um booking criado
  const inPaymentFlow = !!created;
  const approved =
    created?.status === "CONFIRMED" || pix?.status === "approved";
  const expired = created?.status === "EXPIRED";
  const awaitingPayment = inPaymentFlow && !approved && !expired;

  // Polling: mantém a tela atualizada até aprovar (sem loading global)
  useEffect(() => {
    clearPollers();
    if (!created) return;

    // countdown só faz sentido enquanto aguarda pagamento
    if (created.status === "PENDING_PAYMENT" && created.expiresAt) {
      const tick = () => {
        const end = new Date(created.expiresAt!).getTime();
        const now = Date.now();
        setRemainingMs(end - now);
      };
      tick();
      countdownRef.current = window.setInterval(tick, 1000);
    } else {
      setRemainingMs(null);
    }

    // se já confirmado/cancelado/expirado etc, não precisa polling
    if (created.status !== "PENDING_PAYMENT") return;

    pollRef.current = window.setInterval(async () => {
      try {
        const b = await loadBooking(created.id);
        setCreated(b);

        if (pix?.mpPaymentId) {
          const mp = await loadMpPaymentStatus(pix.mpPaymentId);
          const mpStatus = mp?.status as string | undefined;
          if (mpStatus && mpStatus !== pix.status) {
            setPix((p) => (p ? { ...p, status: mpStatus } : p));
          }
        }
      } catch {
        // silencioso
      }
    }, 3000);

    return () => {
      clearPollers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created?.id, created?.status, created?.expiresAt, pix?.mpPaymentId]);

  useEffect(() => {
    void loadServices();
    return () => clearPollers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadAvailability({ resetFlow: true, showLoader: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date]);

  async function copyPixCode() {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = pix.qrCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-y-contain bg-zinc-50 no-scrollbar [-webkit-overflow-scrolling:touch]">
      <div className="min-h-full p-4 sm:p-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="rounded-2xl bg-white shadow p-4">
            <h1 className="text-xl font-semibold">Agendamento</h1>
            <p className="text-sm text-zinc-600">
              {inPaymentFlow
                ? approved
                  ? "Pagamento confirmado."
                  : expired
                    ? "O prazo para pagamento terminou."
                    : "Finalize o pagamento para confirmar."
                : "Escolha serviço, data e horário."}
            </p>
          </header>

          {err && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-zinc-600">Carregando...</div>
          ) : (
            <>
              {/* FORMULARIO (some quando entrou no fluxo de pagamento) */}
              {!inPaymentFlow && (
                <>
                  <section className="rounded-2xl bg-white shadow p-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm">Serviço</label>
                        <select
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} •{" "}
                              {s.durationMinutes === 0
                                ? ""
                                : `${s.durationMinutes}min • `}
                              {formatMoney(s.priceCents)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm">Data</label>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        Horários disponíveis
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availability?.slots?.map((s) => (
                          <button
                            key={s.startAt}
                            className={[
                              "rounded-xl border px-3 py-2 text-sm",
                              selectedStartAt === s.startAt
                                ? "bg-zinc-900 text-white"
                                : "bg-white",
                            ].join(" ")}
                            onClick={() => setSelectedStartAt(s.startAt)}
                          >
                            {new Date(s.startAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </button>
                        ))}
                        {availability && availability.slots.length === 0 && (
                          <div className="text-sm text-zinc-600 col-span-full">
                            Sem horários para este dia.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white shadow p-4 space-y-3">
                    <h2 className="font-semibold">Seus dados</h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm">Nome</label>
                        <input
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                          value={customer.name}
                          onChange={(e) =>
                            setCustomer((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm">Telefone</label>
                        <input
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                          value={customer.phone}
                          onChange={(e) =>
                            setCustomer((p) => ({
                              ...p,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Email</label>
                      <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={customer.email}
                        onChange={(e) =>
                          setCustomer((p) => ({ ...p, email: e.target.value }))
                        }
                      />

                      <div className="text-xs text-zinc-500 mt-1">
                        Obs.: Para gerar PIX, o Mercado Pago normalmente exige
                        email do pagador.
                      </div>
                    </div>

                    <button
                      className="w-full rounded-xl bg-zinc-900 text-white py-2 disabled:opacity-60"
                      disabled={
                        !selectedStartAt ||
                        !customer.name ||
                        !customer.phone ||
                        !customer.email.trim() ||
                        pixLoading
                      }
                      onClick={() => void createBooking()}
                    >
                      Confirmar agendamento
                    </button>

                    {selectedService && (
                      <div className="text-sm text-zinc-600">
                        Serviço:{" "}
                        <span className="font-medium">
                          {selectedService.name}
                        </span>{" "}
                        • {formatMoney(selectedService.priceCents)}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* TELA DE PAGAMENTO PIX */}
              {inPaymentFlow && created && (
                <section className="rounded-2xl bg-white shadow p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Pagamento via PIX
                      </h2>
                      <p className="text-sm text-zinc-600">
                        {approved
                          ? "Pagamento aprovado. Seu agendamento está confirmado."
                          : expired
                            ? "Reserva expirada. Será necessário agendar novamente."
                            : "Agendamento reservado. Faça o pagamento para confirmar."}
                      </p>
                    </div>

                    <div className="text-right">
                      <div
                        className={[
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          approved
                            ? "bg-green-100 text-green-800"
                            : expired
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800",
                        ].join(" ")}
                      >
                        {approved
                          ? "Pagamento aprovado"
                          : expired
                            ? "Reserva expirada"
                            : "Aguardando pagamento"}
                      </div>

                      {created.expiresAt && awaitingPayment && (
                        <div className="mt-1 text-xs text-zinc-600">
                          Expira em:{" "}
                          <span className="font-mono">
                            {remainingMs == null
                              ? "--:--"
                              : msToMMSS(remainingMs)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-50 border p-3 text-sm">
                    <div>
                      Código:{" "}
                      <span className="font-mono font-semibold">
                        {created.code}
                      </span>
                    </div>
                    <div>
                      Horário: {new Date(created.startAt).toLocaleString()}
                    </div>
                    <div className="mt-2 text-zinc-700">
                      {created.signalAmountCents > 0 ? (
                        <>
                          Valor do sinal:{" "}
                          <span className="font-semibold">
                            {formatMoney(created.signalAmountCents)}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {" "}
                            (para confirmar)
                          </span>
                        </>
                      ) : (
                        <>
                          Valor:{" "}
                          <span className="font-semibold">
                            {formatMoney(created.totalPriceCents)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {pixErr && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {pixErr}
                    </div>
                  )}

                  {!pix && !pixLoading && awaitingPayment && (
                    <div className="space-y-2">
                      <div className="text-sm text-zinc-700">
                        Precisamos gerar o PIX para você. Se o email estiver
                        vazio, informe abaixo:
                      </div>

                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="Email do pagador"
                        value={customer.email}
                        onChange={(e) =>
                          setCustomer((p) => ({ ...p, email: e.target.value }))
                        }
                      />

                      <button
                        className="w-full rounded-xl bg-zinc-900 text-white py-2 disabled:opacity-60"
                        disabled={!customer.email}
                        onClick={() =>
                          void startPixFlow(created, customer.email)
                        }
                      >
                        Gerar PIX
                      </button>
                    </div>
                  )}

                  {pixLoading && (
                    <div className="text-sm text-zinc-600">Gerando PIX...</div>
                  )}

                  {approved && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border p-4 bg-white">
                        <div className="flex flex-col items-center justify-center py-10">
                          <div className="h-20 w-20 rounded-full bg-lime-500 flex items-center justify-center">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="h-10 w-10 text-white"
                            >
                              <path
                                d="M20 6L9 17l-5-5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div className="mt-4 text-sm font-semibold text-zinc-900">
                            Confirmado
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 text-center">
                            Pagamento identificado.
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4 bg-white">
                        <div className="text-sm font-medium">
                          Detalhes do agendamento
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">Código</span>
                            <span className="font-mono font-semibold">
                              {created.code}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">Horário</span>
                            <span className="font-medium">
                              {new Date(created.startAt).toLocaleString()}
                            </span>
                          </div>

                          {selectedService && (
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-500">Serviço</span>
                              <span className="font-medium">
                                {selectedService.name} •{" "}
                                {selectedService.durationMinutes}min
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">
                              {created.signalAmountCents > 0
                                ? "Sinal"
                                : "Total"}
                            </span>
                            <span className="font-semibold">
                              {formatMoney(
                                created.signalAmountCents > 0
                                  ? created.signalAmountCents
                                  : created.totalPriceCents,
                              )}
                            </span>
                          </div>

                          <div className="pt-3 mt-3 border-t">
                            <div className="text-xs text-zinc-500 mb-2">
                              Cliente
                            </div>
                            <div className="text-sm">{customer.name}</div>
                            <div className="text-sm text-zinc-600">
                              {customer.phone}
                            </div>
                            <div className="text-sm text-zinc-600">
                              {customer.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {awaitingPayment && pix && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border p-4 bg-white">
                        <div className="text-sm font-medium">QR Code</div>
                        <div className="mt-3 flex justify-center">
                          {pix.qrCodeBase64 ? (
                            <img
                              alt="QR Code PIX"
                              className="w-56 h-56"
                              src={`data:image/png;base64,${pix.qrCodeBase64}`}
                            />
                          ) : (
                            <div className="text-sm text-zinc-600">
                              QR Code indisponível.
                            </div>
                          )}
                        </div>

                        {pix.ticketUrl && (
                          <a
                            className="mt-3 block text-sm text-blue-600 hover:underline"
                            href={pix.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir link do pagamento
                          </a>
                        )}
                      </div>

                      <div className="rounded-2xl border p-4 bg-white space-y-3">
                        <div>
                          <div className="text-sm font-medium">
                            Pix “copia e cola”
                          </div>
                          <textarea
                            readOnly
                            className="mt-2 w-full h-36 rounded-xl border p-2 text-xs font-mono"
                            value={pix.qrCode ?? ""}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              className="flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm disabled:opacity-60"
                              disabled={!pix.qrCode}
                              onClick={() => void copyPixCode()}
                            >
                              Copiar código
                            </button>

                            <button
                              className="flex-1 rounded-xl border py-2 text-sm"
                              onClick={async () => {
                                try {
                                  const b = await loadBooking(created.id);
                                  setCreated(b);
                                  if (pix.mpPaymentId) {
                                    const mp = await loadMpPaymentStatus(
                                      pix.mpPaymentId,
                                    );
                                    const mpStatus = mp?.status as
                                      | string
                                      | undefined;
                                    if (mpStatus) {
                                      setPix((p) =>
                                        p ? { ...p, status: mpStatus } : p,
                                      );
                                    }
                                  }
                                } catch {}
                              }}
                            >
                              Atualizar
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-zinc-500">
                          A tela atualiza automaticamente. Assim que o pagamento
                          for aprovado, seu agendamento será confirmado.
                        </div>

                        {import.meta.env.DEV && pix.paymentId && (
                          <button
                            className="w-full rounded-xl border py-2 text-sm"
                            onClick={async () => {
                              try {
                                await publicApi.post(
                                  `/dev/payments/${pix.paymentId}/approve`,
                                );
                                const b = await loadBooking(created.id);
                                setCreated(b);
                              } catch {}
                            }}
                          >
                            (DEV) Simular aprovação
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {expired && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                      <h3 className="font-semibold text-red-800">
                        Reserva expirada
                      </h3>
                      <div className="text-sm text-red-800 mt-1">
                        O prazo para pagamento terminou. Volte e faça um novo
                        agendamento.
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
