import inactiveAnim from "@/assets/lotties/link-inactive.json";
import invalidAnim from "@/assets/lotties/link-invalid.json";
import { useLoading } from "@/lib/loading";
import { Player } from "@lottiefiles/react-lottie-player";
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
  status: string;
  statusDetail?: string | null;
  expiresAt?: string | null;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  ticketUrl?: string | null;
};

type LinkScreenState = "OK" | "INVALID" | "INACTIVE";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function msToMMSS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function inputBase(hasError?: boolean) {
  return [
    "mt-1 w-full rounded-xl border px-3 py-2 outline-none",
    "bg-background text-foreground",
    "border-border focus:ring-2 focus:ring-ring/30 focus:border-ring/40",
    hasError ? "border-destructive/60 ring-2 ring-destructive/20" : "",
  ].join(" ");
}

function cardBase(className?: string) {
  return [
    "rounded-2xl border bg-card p-4 shadow-sm",
    "border-border",
    className ?? "",
  ].join(" ");
}

function subtlePanel(className?: string) {
  return [
    "rounded-xl border bg-muted/30 p-3 text-sm",
    "border-border",
    className ?? "",
  ].join(" ");
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

  const [pix, setPix] = useState<PixPayment | null>(null);
  const [pixErr, setPixErr] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const base = useMemo(() => `/public/links/${token}`, [token]);
  const selectedService = services.find((s) => s.id === serviceId);

  const pollRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const [linkState, setLinkState] = useState<LinkScreenState>("OK");
  const [linkMsg, setLinkMsg] = useState<string>("");
  const [availLoading, setAvailLoading] = useState(false);

  async function loadServices() {
    if (!token) return;
    setErr(null);
    setLoading(true);
    setLinkState("OK");
    setLinkMsg("");
    show("Carregando serviços...");

    try {
      const { data } = await publicApi.get<Service[]>(`${base}/services`);
      setServices(data);
      if (data[0]) setServiceId(data[0].id);
    } catch (e: any) {
      const status = e?.response?.status as number | undefined;
      const msg = (e?.response?.data?.message as string | undefined) ?? "";

      if (status === 404 || /token|inválid|inexistente/i.test(msg)) {
        setLinkState("INVALID");
        setLinkMsg(msg || "Esse link não existe ou expirou.");
        return;
      }

      if (status === 403 || /inativ|desativad/i.test(msg)) {
        setLinkState("INACTIVE");
        setLinkMsg(msg || "Esse link está inativo no momento.");
        return;
      }

      setErr(msg || "Falha ao carregar serviços.");
    } finally {
      hide();
      setLoading(false);
    }
  }

  function FullScreenState(props: {
    title: string;
    message?: string;
    animationData: object;
  }) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-[260px] h-[260px]">
          <Player
            autoplay
            loop
            src={props.animationData}
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        <div className="mt-4 text-2xl sm:text-3xl font-semibold text-foreground">
          {props.title}
        </div>

        {props.message && (
          <div className="mt-2 text-base sm:text-lg text-muted-foreground max-w-xl">
            {props.message}
          </div>
        )}
      </div>
    );
  }

  async function loadAvailability(opts?: {
    resetFlow?: boolean;
    showLoader?: boolean;
  }) {
    if (!token || !serviceId) return;

    const resetFlow = opts?.resetFlow ?? true;
    const showLoader = opts?.showLoader ?? true;

    setErr(null);

    if (resetFlow) {
      setCreated(null);
      setPix(null);
      setPixErr(null);
      setSelectedStartAt("");
    }

    setAvailLoading(true);
    if (showLoader) show("Carregando horários...");

    try {
      const { data } = await publicApi.get<AvailabilityResponse>(
        `${base}/availability`,
        { params: { serviceId, date } },
      );
      setAvailability(data);
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ?? "Falha ao carregar disponibilidade.",
      );
    } finally {
      if (showLoader) hide();
      setAvailLoading(false);
    }
  }

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
      intent: "SIGNAL",
    };
    const { data } = await publicApi.post<PixPayment>(`/payments/pix`, payload);
    return data;
  }

  async function loadMpPaymentStatus(mpPaymentId: string) {
    const { data } = await publicApi.get<any>(`/payments/${mpPaymentId}`);
    return data;
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

  const inPaymentFlow = !!created;
  const approved =
    created?.status === "CONFIRMED" || pix?.status === "approved";
  const expired = created?.status === "EXPIRED";
  const awaitingPayment = inPaymentFlow && !approved && !expired;

  useEffect(() => {
    clearPollers();
    if (!created) return;

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
      } catch {}
    }, 3000);

    return () => clearPollers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created?.id, created?.status, created?.expiresAt, pix?.mpPaymentId]);

  useEffect(() => {
    void loadServices();
    return () => clearPollers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // useEffect(() => {
  //   void loadAvailability({ resetFlow: true, showLoader: true });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [serviceId, date]);

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
    <div className="fixed inset-0 overflow-y-auto overscroll-y-contain bg-background no-scrollbar [-webkit-overflow-scrolling:touch]">
      <div className="min-h-full p-4 sm:p-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className={cardBase()}>
            <h1 className="text-xl font-semibold text-foreground">
              Agendamento
            </h1>
            <p className="text-sm text-muted-foreground">
              {inPaymentFlow
                ? approved
                  ? "Pagamento confirmado."
                  : expired
                    ? "O prazo para pagamento terminou."
                    : "Finalize o pagamento para confirmar."
                : "Escolha serviço, data e horário."}
            </p>
          </header>

          {!loading && linkState === "INVALID" && (
            <FullScreenState
              title="Link inválido"
              message={
                linkMsg || "Verifique se você copiou o link corretamente."
              }
              animationData={invalidAnim as object}
            />
          )}

          {!loading && linkState === "INACTIVE" && (
            <FullScreenState
              title="Link inativo"
              message={
                linkMsg ||
                "Esse link foi desativado. Solicite um novo ao responsável."
              }
              animationData={inactiveAnim as object}
            />
          )}

          {err && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </div>
          )}

          {!loading && linkState !== "OK" ? null : (
            <>
              {!inPaymentFlow && (
                <>
                  <section className={cardBase("space-y-4")}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Serviço
                        </label>
                        <select
                          className={inputBase(false)}
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
                        <label className="text-sm text-muted-foreground">
                          Data
                        </label>
                        <input
                          type="date"
                          className={inputBase(false)}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
                        disabled={!serviceId || !date || availLoading}
                        onClick={() =>
                          void loadAvailability({
                            resetFlow: true,
                            showLoader: true,
                          })
                        }
                      >
                        {availLoading ? "Buscando..." : "Buscar horários"}
                      </button>

                      {/* {availability && (
                        <button
                          type="button"
                          className="w-full sm:w-auto rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted/40 disabled:opacity-60"
                          disabled={availLoading}
                          onClick={() => {
                            setAvailability(null);
                            setSelectedStartAt("");
                          }}
                        >
                          Limpar
                        </button>
                      )} */}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Horários disponíveis:
                      </div>

                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availability?.slots?.map((s) => {
                          const selected = selectedStartAt === s.startAt;
                          return (
                            <button
                              key={s.startAt}
                              type="button"
                              className={[
                                "rounded-xl border px-3 py-2 text-sm transition-colors",
                                "border-border",
                                selected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card hover:bg-muted/40",
                              ].join(" ")}
                              onClick={() => setSelectedStartAt(s.startAt)}
                            >
                              {new Date(s.startAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </button>
                          );
                        })}

                        {availability && availability.slots.length === 0 && (
                          <div className="text-sm text-muted-foreground col-span-full">
                            Sem horários para este dia.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className={cardBase("space-y-3")}>
                    <h2 className="font-semibold text-foreground">
                      Seus dados
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Nome
                        </label>
                        <input
                          className={inputBase(false)}
                          value={customer.name}
                          onChange={(e) =>
                            setCustomer((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm text-muted-foreground">
                          Telefone
                        </label>
                        <input
                          className={inputBase(false)}
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
                      <label className="text-sm text-muted-foreground">
                        Email
                      </label>
                      <input
                        className={inputBase(false)}
                        value={customer.email}
                        onChange={(e) =>
                          setCustomer((p) => ({ ...p, email: e.target.value }))
                        }
                      />

                      <div className="text-xs text-muted-foreground mt-1">
                        Obs.: Para gerar PIX, o Mercado Pago normalmente exige
                        email do pagador.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full rounded-xl bg-primary text-primary-foreground py-2 font-medium disabled:opacity-60"
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
                      <div className="text-sm text-muted-foreground">
                        Serviço:{" "}
                        <span className="font-medium text-foreground">
                          {selectedService.name}
                        </span>{" "}
                        • {formatMoney(selectedService.priceCents)}
                      </div>
                    )}
                  </section>
                </>
              )}

              {inPaymentFlow && created && (
                <section className={cardBase("space-y-4")}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Pagamento via PIX
                      </h2>
                      <p className="text-sm text-muted-foreground">
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
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
                          approved
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : expired
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20",
                        ].join(" ")}
                      >
                        {approved
                          ? "Pagamento aprovado"
                          : expired
                            ? "Reserva expirada"
                            : "Aguardando pagamento"}
                      </div>

                      {created.expiresAt && awaitingPayment && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Expira em:{" "}
                          <span className="font-mono text-foreground">
                            {remainingMs == null
                              ? "--:--"
                              : msToMMSS(remainingMs)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={subtlePanel()}>
                    <div>
                      Código:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {created.code}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Horário:{" "}
                      <span className="text-foreground">
                        {new Date(created.startAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 text-muted-foreground">
                      {created.signalAmountCents > 0 ? (
                        <>
                          Valor do sinal:{" "}
                          <span className="font-semibold text-foreground">
                            {formatMoney(created.signalAmountCents)}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            (para confirmar)
                          </span>
                        </>
                      ) : (
                        <>
                          Valor:{" "}
                          <span className="font-semibold text-foreground">
                            {formatMoney(created.totalPriceCents)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {pixErr && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {pixErr}
                    </div>
                  )}

                  {!pix && !pixLoading && awaitingPayment && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Precisamos gerar o PIX para você. Se o email estiver
                        vazio, informe abaixo:
                      </div>

                      <input
                        className={inputBase(false).replace("mt-1 ", "")}
                        placeholder="Email do pagador"
                        value={customer.email}
                        onChange={(e) =>
                          setCustomer((p) => ({ ...p, email: e.target.value }))
                        }
                      />

                      <button
                        type="button"
                        className="w-full rounded-xl bg-primary text-primary-foreground py-2 font-medium disabled:opacity-60"
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
                    <div className="text-sm text-muted-foreground">
                      Gerando PIX...
                    </div>
                  )}

                  {approved && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={cardBase()}>
                        <div className="flex flex-col items-center justify-center py-10">
                          <div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center">
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
                          <div className="mt-4 text-sm font-semibold text-foreground">
                            Confirmado
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 text-center">
                            Pagamento identificado.
                          </div>
                        </div>
                      </div>

                      <div className={cardBase()}>
                        <div className="text-sm font-medium text-foreground">
                          Detalhes do agendamento
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Código
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                              {created.code}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Horário
                            </span>
                            <span className="font-medium text-foreground">
                              {new Date(created.startAt).toLocaleString()}
                            </span>
                          </div>

                          {selectedService && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                Serviço
                              </span>
                              <span className="font-medium text-foreground">
                                {selectedService.name} •{" "}
                                {selectedService.durationMinutes}min
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              {created.signalAmountCents > 0
                                ? "Sinal"
                                : "Total"}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatMoney(
                                created.signalAmountCents > 0
                                  ? created.signalAmountCents
                                  : created.totalPriceCents,
                              )}
                            </span>
                          </div>

                          <div className="pt-3 mt-3 border-t border-border">
                            <div className="text-xs text-muted-foreground mb-2">
                              Cliente
                            </div>
                            <div className="text-sm text-foreground">
                              {customer.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer.phone}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {awaitingPayment && pix && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={cardBase()}>
                        <div className="text-sm font-medium text-foreground">
                          QR Code
                        </div>
                        <div className="mt-3 flex justify-center">
                          {pix.qrCodeBase64 ? (
                            <img
                              alt="QR Code PIX"
                              className="w-56 h-56 rounded-xl bg-white p-2"
                              src={`data:image/png;base64,${pix.qrCodeBase64}`}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              QR Code indisponível.
                            </div>
                          )}
                        </div>

                        {pix.ticketUrl && (
                          <a
                            className="mt-3 block text-sm text-primary hover:underline"
                            href={pix.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir link do pagamento
                          </a>
                        )}
                      </div>

                      <div className={cardBase("space-y-3")}>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            Pix “copia e cola”
                          </div>
                          <textarea
                            readOnly
                            className={[
                              "mt-2 w-full h-36 rounded-xl border p-2 text-xs font-mono outline-none",
                              "bg-background text-foreground border-border",
                              "focus:ring-2 focus:ring-ring/30 focus:border-ring/40",
                            ].join(" ")}
                            value={pix.qrCode ?? ""}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
                              disabled={!pix.qrCode}
                              onClick={() => void copyPixCode()}
                            >
                              Copiar código
                            </button>

                            <button
                              type="button"
                              className="flex-1 rounded-xl border border-border bg-card py-2 text-sm hover:bg-muted/40"
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

                        <div className="text-xs text-muted-foreground">
                          A tela atualiza automaticamente. Assim que o pagamento
                          for aprovado, seu agendamento será confirmado.
                        </div>

                        {import.meta.env.DEV && pix.paymentId && (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-border bg-card py-2 text-sm hover:bg-muted/40"
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
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                      <h3 className="font-semibold text-destructive">
                        Reserva expirada
                      </h3>
                      <div className="text-sm text-muted-foreground mt-1">
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
