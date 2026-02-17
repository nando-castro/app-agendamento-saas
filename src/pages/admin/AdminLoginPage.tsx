import authService from "@/gateway/services/authService";
import { useLoading } from "@/lib/loading";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setAdminToken } from "../../lib/storage";

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 10.6a2.5 2.5 0 0 0 3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 5.6A10.2 10.2 0 0 1 12 5c6 0 9.5 7 9.5 7a18.7 18.7 0 0 1-4.2 4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.7 7.6C4 9.7 2.5 12 2.5 12s3.5 7 9.5 7c1 0 2-.2 2.9-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LocationState = { from?: string };

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function AdminLoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { show, hide } = useLoading();

  const from =
    (location.state as LocationState | null)?.from &&
    typeof (location.state as any).from === "string"
      ? (location.state as LocationState).from!
      : "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);

  const emailTrim = email.trim();

  const fieldErrors = useMemo(() => {
    const emailError = !emailTrim
      ? "Informe o e-mail."
      : !isValidEmail(emailTrim)
        ? "E-mail inválido."
        : null;

    const passwordError = !password ? "Informe a senha." : null;

    return { emailError, passwordError };
  }, [emailTrim, password]);

  const showEmailError = touched.email ? fieldErrors.emailError : null;
  const showPasswordError = touched.password ? fieldErrors.passwordError : null;

  const canSubmit =
    !fieldErrors.emailError && !fieldErrors.passwordError && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTouched({ email: true, password: true });
    if (fieldErrors.emailError || fieldErrors.passwordError) return;

    setLoading(true);
    show("Entrando...");

    try {
      const { data } = await authService.login({ email: emailTrim, password });
      setAdminToken(data.accessToken);
      nav(from, { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha no login.");
    } finally {
      hide();
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background igual landing */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_50%_0%,rgba(59,130,246,0.18),transparent)]" />
      </div>

      <div className="relative min-h-screen grid place-items-center p-4">
        <div className="w-full max-w-md">
          {/* “brand” */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="text-sm font-semibold tracking-tight">AS</span>
            </div>
            <div className="leading-tight text-left">
              <div className="text-sm font-semibold tracking-tight">
                Agendamentos SaaS
              </div>
              <div className="text-xs text-white/60">Painel administrativo</div>
            </div>
          </div>

          {/* Card glass */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-xl">
            <h1 className="text-xl font-semibold tracking-tight">Login Admin</h1>
            <p className="mt-1 text-sm text-white/60">
              Entre para gerenciar serviços, horários e agendamentos.
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label className="text-sm text-white/80">E-mail</label>
                <input
                  className={[
                    "mt-1 w-full rounded-xl border px-3 py-2 outline-none bg-slate-950/40 text-white placeholder:text-white/35",
                    "border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10",
                    showEmailError ? "border-rose-400/60 ring-2 ring-rose-400/10" : "",
                  ].join(" ")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErr(null);
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  autoComplete="email"
                  type="email"
                  inputMode="email"
                  aria-invalid={!!showEmailError}
                  aria-describedby="email-error"
                />
                {showEmailError && (
                  <div id="email-error" className="mt-1 text-xs text-rose-200">
                    {showEmailError}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-white/80">Senha</label>
                <div className="mt-1 relative">
                  <input
                    className={[
                      "w-full rounded-xl border px-3 py-2 pr-11 outline-none bg-slate-950/40 text-white placeholder:text-white/35",
                      "border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10",
                      showPasswordError
                        ? "border-rose-400/60 ring-2 ring-rose-400/10"
                        : "",
                    ].join(" ")}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErr(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={!!showPasswordError}
                    aria-describedby="password-error"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/5"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    title={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {showPasswordError && (
                  <div
                    id="password-error"
                    className="mt-1 text-xs text-rose-200"
                  >
                    {showPasswordError}
                  </div>
                )}
              </div>

              {err && (
                <div className="rounded-xl bg-rose-500/10 ring-1 ring-rose-400/20 px-3 py-2 text-sm text-rose-100">
                  {err}
                </div>
              )}

              <button
                disabled={!canSubmit}
                className={[
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition",
                  "bg-white text-slate-950 hover:bg-white/90",
                  "disabled:opacity-60 disabled:hover:bg-white",
                ].join(" ")}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="text-sm text-white/60">
                Não tem conta?{" "}
                <Link className="underline hover:text-white" to="/admin/register">
                  Registrar
                </Link>
              </div>

              <div className="pt-3 text-xs text-white/40">
                Ao entrar, você concorda com os termos e política de privacidade.
              </div>
            </form>
          </div>

          {/* link de volta */}
          <div className="mt-5 text-center text-xs text-white/40">
            <Link className="hover:text-white" to="/">
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
