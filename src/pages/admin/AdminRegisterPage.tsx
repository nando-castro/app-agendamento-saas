import authService from "@/gateway/services/authService";
import { useLoading } from "@/lib/loading";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

type FormState = {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidSlug(v: string) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length >= 3 && v.length <= 32
  );
}

function slugifyCore(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function slugifyAuto(input: string) {
  return slugifyCore(input).trim().replace(/^-+/, "").replace(/-+$/, "");
}

function slugifyTyping(input: string) {
  return slugifyCore(input).trim().replace(/^-+/, "");
}

function slugifyFinal(input: string) {
  return slugifyCore(input).trim().replace(/^-+/, "").replace(/-+$/, "");
}

export default function AdminRegisterPage() {
  const nav = useNavigate();
  const { show, hide } = useLoading();

  const [form, setForm] = useState<FormState>({
    tenantName: "",
    tenantSlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    tenantName: false,
    tenantSlug: false,
    adminName: false,
    adminEmail: false,
    adminPassword: false,
    adminPasswordConfirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [slugDirty, setSlugDirty] = useState(false);

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const normalized = useMemo(() => {
    const tenantName = form.tenantName.trim();
    const tenantSlug = slugifyFinal(form.tenantSlug);
    const adminName = form.adminName.trim();
    const adminEmail = form.adminEmail.trim();
    const adminPassword = form.adminPassword;
    const adminPasswordConfirm = form.adminPasswordConfirm;

    return {
      tenantName,
      tenantSlug,
      adminName,
      adminEmail,
      adminPassword,
      adminPasswordConfirm,
    };
  }, [form]);

  const fieldErrors = useMemo(() => {
    const tenantNameError = !normalized.tenantName
      ? "Informe o nome do negócio."
      : null;

    const tenantSlugError = !normalized.tenantSlug
      ? "Informe como ficará o final da URL da página (slug)."
      : !isValidSlug(normalized.tenantSlug)
        ? "Use apenas letras minúsculas, números e hífen (ex: studio-bela)."
        : null;

    const adminNameError = !normalized.adminName
      ? "Informe o nome do administrador."
      : null;

    const adminEmailError = !normalized.adminEmail
      ? "Informe o e-mail do administrador."
      : !isValidEmail(normalized.adminEmail)
        ? "E-mail inválido."
        : null;

    const adminPasswordError = !normalized.adminPassword
      ? "Informe a senha."
      : normalized.adminPassword.length < 6
        ? "Senha muito curta (mínimo 6 caracteres)."
        : null;

    const adminPasswordConfirmError = !normalized.adminPasswordConfirm
      ? "Confirme a senha."
      : normalized.adminPasswordConfirm !== normalized.adminPassword
        ? "As senhas não conferem."
        : null;

    return {
      tenantNameError,
      tenantSlugError,
      adminNameError,
      adminEmailError,
      adminPasswordError,
      adminPasswordConfirmError,
    };
  }, [normalized]);

  const canSubmit =
    !fieldErrors.tenantNameError &&
    !fieldErrors.tenantSlugError &&
    !fieldErrors.adminNameError &&
    !fieldErrors.adminEmailError &&
    !fieldErrors.adminPasswordError &&
    !fieldErrors.adminPasswordConfirmError &&
    !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    setTouched({
      tenantName: true,
      tenantSlug: true,
      adminName: true,
      adminEmail: true,
      adminPassword: true,
      adminPasswordConfirm: true,
    });

    if (
      fieldErrors.tenantNameError ||
      fieldErrors.tenantSlugError ||
      fieldErrors.adminNameError ||
      fieldErrors.adminEmailError ||
      fieldErrors.adminPasswordError ||
      fieldErrors.adminPasswordConfirmError
    ) {
      return;
    }

    setLoading(true);
    show("Criando conta...");

    try {
      const payload = {
        tenantName: normalized.tenantName,
        tenantSlug: normalized.tenantSlug,
        adminName: normalized.adminName,
        adminEmail: normalized.adminEmail,
        adminPassword: normalized.adminPassword,
      };

      const { data } = await authService.register(payload as any);
      setAdminToken(data.accessToken);
      nav("/admin", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha no cadastro.");
    } finally {
      hide();
      setLoading(false);
    }
  }

  useEffect(() => {
    if (slugDirty) return;
    const next = slugifyAuto(form.tenantName);
    setForm((p) => ({ ...p, tenantSlug: next }));
  }, [form.tenantName, slugDirty]);

  function makeSlugSuggestions(tenantName: string): string[] {
    const base = slugifyAuto(tenantName);
    if (!base) return [];
    return Array.from(new Set([base, `${base}-oficial`, `${base}-br`])).slice(
      0,
      3,
    );
  }

  const slugSuggestions = useMemo(() => {
    if (!normalized.tenantName) return [];
    if (slugDirty) return [];
    return makeSlugSuggestions(normalized.tenantName);
  }, [normalized.tenantName, slugDirty]);

  function inputClass(hasError: boolean) {
    return [
      "mt-1 w-full rounded-xl border px-3 py-2 outline-none",
      "bg-slate-950/40 text-white placeholder:text-white/35",
      "border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10",
      hasError ? "border-rose-400/60 ring-2 ring-rose-400/10" : "",
    ].join(" ");
  }

  return (
    <div className="h-dvh overflow-y-auto p-4 sm:min-h-screen sm:grid sm:place-items-center sm:overflow-visible">
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Background igual landing */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-[-140px] right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_50%_0%,rgba(59,130,246,0.18),transparent)]" />
        </div>

        <div className="relative min-h-screen p-4">
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center py-10">
            {/* brand */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <span className="text-sm font-semibold tracking-tight">AS</span>
              </div>
              <div className="leading-tight text-left">
                <div className="text-sm font-semibold tracking-tight">
                  Agendamentos SaaS
                </div>
                <div className="text-xs text-white/60">Criar conta</div>
              </div>
            </div>

            {/* Card glass */}
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-xl">
              <h1 className="text-xl font-semibold tracking-tight">
                Criar conta
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Configure seu negócio e o admin em poucos passos.
              </p>

              <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                {/* Nome do negócio */}
                <div>
                  <label className="text-sm text-white/80">
                    Nome do negócio (ex: Studio Bela)
                  </label>
                  <input
                    className={inputClass(
                      !!(touched.tenantName && fieldErrors.tenantNameError),
                    )}
                    value={form.tenantName}
                    onChange={(e) => {
                      set("tenantName", e.target.value);
                      setErr(null);
                    }}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, tenantName: true }))
                    }
                    type="text"
                    aria-invalid={
                      !!(touched.tenantName && fieldErrors.tenantNameError)
                    }
                    aria-describedby="tenantName-error"
                  />
                  {touched.tenantName && fieldErrors.tenantNameError && (
                    <div
                      id="tenantName-error"
                      className="mt-1 text-xs text-rose-200"
                    >
                      {fieldErrors.tenantNameError}
                    </div>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="text-sm text-white/80">
                    Final da URL da Página do Negócio (ex: studio-bela)
                  </label>
                  <input
                    className={inputClass(
                      !!(touched.tenantSlug && fieldErrors.tenantSlugError),
                    )}
                    value={form.tenantSlug}
                    onChange={(e) => {
                      setSlugDirty(true);
                      set("tenantSlug", slugifyTyping(e.target.value));
                      setErr(null);
                    }}
                    onBlur={() => {
                      setTouched((t) => ({ ...t, tenantSlug: true }));
                      set("tenantSlug", slugifyFinal(form.tenantSlug));
                    }}
                    type="text"
                    autoComplete="username"
                    aria-invalid={
                      !!(touched.tenantSlug && fieldErrors.tenantSlugError)
                    }
                    aria-describedby="tenantSlug-error"
                  />

                  {slugSuggestions.length >= 1 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slugSuggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/10"
                          onClick={() => {
                            set("tenantSlug", sug);
                            setSlugDirty(true);
                            setTouched((t) => ({ ...t, tenantSlug: true }));
                          }}
                          title="Usar sugestão"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  {touched.tenantSlug && fieldErrors.tenantSlugError && (
                    <div
                      id="tenantSlug-error"
                      className="mt-1 text-xs text-rose-200"
                    >
                      {fieldErrors.tenantSlugError}
                    </div>
                  )}

                  {!touched.tenantSlug && (
                    <div className="mt-1 text-xs text-white/45">
                      Dica: use letras minúsculas e hífen. Ex:{" "}
                      <span className="font-mono text-white/70">
                        studio-bela
                      </span>
                    </div>
                  )}
                </div>

                {/* Admin name */}
                <div>
                  <label className="text-sm text-white/80">
                    Nome do administrador
                  </label>
                  <input
                    className={inputClass(
                      !!(touched.adminName && fieldErrors.adminNameError),
                    )}
                    value={form.adminName}
                    onChange={(e) => {
                      set("adminName", e.target.value);
                      setErr(null);
                    }}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, adminName: true }))
                    }
                    type="text"
                    aria-invalid={
                      !!(touched.adminName && fieldErrors.adminNameError)
                    }
                    aria-describedby="adminName-error"
                  />
                  {touched.adminName && fieldErrors.adminNameError && (
                    <div
                      id="adminName-error"
                      className="mt-1 text-xs text-rose-200"
                    >
                      {fieldErrors.adminNameError}
                    </div>
                  )}
                </div>

                {/* Admin email */}
                <div>
                  <label className="text-sm text-white/80">
                    E-mail do administrador
                  </label>
                  <input
                    className={inputClass(
                      !!(touched.adminEmail && fieldErrors.adminEmailError),
                    )}
                    value={form.adminEmail}
                    onChange={(e) => {
                      set("adminEmail", e.target.value);
                      setErr(null);
                    }}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, adminEmail: true }))
                    }
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={
                      !!(touched.adminEmail && fieldErrors.adminEmailError)
                    }
                    aria-describedby="adminEmail-error"
                  />
                  {touched.adminEmail && fieldErrors.adminEmailError && (
                    <div
                      id="adminEmail-error"
                      className="mt-1 text-xs text-rose-200"
                    >
                      {fieldErrors.adminEmailError}
                    </div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm text-white/80">
                    Senha do administrador
                  </label>
                  <div className="mt-1 relative">
                    <input
                      className={
                        inputClass(
                          !!(
                            touched.adminPassword &&
                            fieldErrors.adminPasswordError
                          ),
                        ) + " pr-11"
                      }
                      value={form.adminPassword}
                      onChange={(e) => {
                        set("adminPassword", e.target.value);
                        setErr(null);
                      }}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, adminPassword: true }))
                      }
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={
                        !!(
                          touched.adminPassword &&
                          fieldErrors.adminPasswordError
                        )
                      }
                      aria-describedby="adminPassword-error"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/5"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      title={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {touched.adminPassword && fieldErrors.adminPasswordError && (
                    <div
                      id="adminPassword-error"
                      className="mt-1 text-xs text-rose-200"
                    >
                      {fieldErrors.adminPasswordError}
                    </div>
                  )}
                </div>

                {/* Password confirm */}
                <div>
                  <label className="text-sm text-white/80">
                    Confirmar senha do administrador
                  </label>
                  <div className="mt-1 relative">
                    <input
                      className={
                        inputClass(
                          !!(
                            touched.adminPasswordConfirm &&
                            fieldErrors.adminPasswordConfirmError
                          ),
                        ) + " pr-11"
                      }
                      value={form.adminPasswordConfirm}
                      onChange={(e) => {
                        set("adminPasswordConfirm", e.target.value);
                        setErr(null);
                      }}
                      onBlur={() =>
                        setTouched((t) => ({
                          ...t,
                          adminPasswordConfirm: true,
                        }))
                      }
                      type={showPasswordConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={
                        !!(
                          touched.adminPasswordConfirm &&
                          fieldErrors.adminPasswordConfirmError
                        )
                      }
                      aria-describedby="adminPasswordConfirm-error"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/5"
                      aria-label={
                        showPasswordConfirm ? "Ocultar senha" : "Mostrar senha"
                      }
                      title={showPasswordConfirm ? "Ocultar" : "Mostrar"}
                    >
                      {showPasswordConfirm ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {touched.adminPasswordConfirm &&
                    fieldErrors.adminPasswordConfirmError && (
                      <div
                        id="adminPasswordConfirm-error"
                        className="mt-1 text-xs text-rose-200"
                      >
                        {fieldErrors.adminPasswordConfirmError}
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
                  {loading ? "Criando..." : "Criar"}
                </button>

                <div className="text-sm text-white/60">
                  Já tem conta?{" "}
                  <Link
                    className="underline hover:text-white"
                    to="/admin/login"
                  >
                    Entrar
                  </Link>
                </div>

                <div className="pt-3 text-xs text-white/40">
                  Ao criar a conta, você concorda com os termos e política de
                  privacidade.
                </div>
              </form>
            </div>

            <div className="mt-5 text-center text-xs text-white/40">
              <Link className="hover:text-white" to="/">
                ← Voltar para a página inicial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
