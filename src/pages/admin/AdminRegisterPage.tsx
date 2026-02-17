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
  adminPasswordConfirm: string; // NOVO
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidSlug(v: string) {
  // letras minúsculas, números e hífen, sem espaços; 3..32 chars
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length >= 3 && v.length <= 32
  );
}

function slugifyCore(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // só [a-z0-9 espaço -]
    .replace(/\s+/g, "-") // espaço -> hífen
    .replace(/-+/g, "-"); // colapsa hífens
}

// para auto-preencher a partir do nome (sem hífen no final)
function slugifyAuto(input: string) {
  return slugifyCore(input).trim().replace(/^-+/, "").replace(/-+$/, "");
}

// para quando o usuário está digitando no campo slug (permite hífen no final durante digitação)
function slugifyTyping(input: string) {
  // NÃO remove o - no final aqui
  return slugifyCore(input).trim().replace(/^-+/, "");
}

// normalização final (antes de validar/enviar)
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
    adminPasswordConfirm: "", // NOVO
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false); // NOVO

  // erro do servidor
  const [err, setErr] = useState<string | null>(null);

  // validação de input (digitou/tocou)
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    tenantName: false,
    tenantSlug: false,
    adminName: false,
    adminEmail: false,
    adminPassword: false,
    adminPasswordConfirm: false, // NOVO
  });

  // mantém só pra desabilitar botão/label
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
    !fieldErrors.adminPasswordConfirmError && // NOVO
    !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // marca tudo como tocado pra exibir as mensagens
    setTouched({
      tenantName: true,
      tenantSlug: true,
      adminName: true,
      adminEmail: true,
      adminPassword: true,
      adminPasswordConfirm: true, // NOVO
    });

    // bloqueia se inválido
    if (
      fieldErrors.tenantNameError ||
      fieldErrors.tenantSlugError ||
      fieldErrors.adminNameError ||
      fieldErrors.adminEmailError ||
      fieldErrors.adminPasswordError ||
      fieldErrors.adminPasswordConfirmError // NOVO
    ) {
      return;
    }

    setLoading(true);
    show("Criando conta...");

    try {
      // não envia confirm pro backend (normalmente ele não precisa)
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
    // Só mostra sugestões se tiver nome do negócio e o usuário ainda não “travou” o slug manualmente
    if (!normalized.tenantName) return [];
    if (slugDirty) return [];
    return makeSlugSuggestions(normalized.tenantName);
  }, [normalized.tenantName, slugDirty]);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold">Criar conta</h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          {(
            [
              ["tenantName", "Nome do negócio (ex: Studio Bela)"],
              ["tenantSlug", "Final da URL da Página do Negócio (ex: studio-bela)"],
              ["adminName", "Nome do administrador"],
              ["adminEmail", "E-mail do administrador"],
              ["adminPassword", "Senha do administrador"],
              ["adminPasswordConfirm", "Confirmar senha do administrador"],
            ] as const
          ).map(([k, label]) => {
            const errorText =
              k === "tenantName"
                ? fieldErrors.tenantNameError
                : k === "tenantSlug"
                  ? fieldErrors.tenantSlugError
                  : k === "adminName"
                    ? fieldErrors.adminNameError
                    : k === "adminEmail"
                      ? fieldErrors.adminEmailError
                      : k === "adminPassword"
                        ? fieldErrors.adminPasswordError
                        : fieldErrors.adminPasswordConfirmError;

            const showFieldError = touched[k] ? errorText : null;
            const inputBase =
              "w-full rounded-xl border px-3 py-2 outline-none " +
              (showFieldError
                ? "border-red-500 ring-2 ring-red-100"
                : "focus:ring-2 focus:ring-zinc-200");

            const isPassword = k === "adminPassword";
            const isPasswordConfirm = k === "adminPasswordConfirm";

            return (
              <div key={k}>
                <label className="text-sm">{label}</label>

                {isPassword || isPasswordConfirm ? (
                  <div className="mt-1 relative">
                    <input
                      className={inputBase + " pr-11"}
                      value={form[k]}
                      onChange={(e) => {
                        set(k, e.target.value);
                        setErr(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
                      type={
                        isPassword
                          ? showPassword
                            ? "text"
                            : "password"
                          : showPasswordConfirm
                            ? "text"
                            : "password"
                      }
                      autoComplete={
                        isPassword ? "new-password" : "new-password"
                      }
                      aria-invalid={!!showFieldError}
                      aria-describedby={`${k}-error`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (isPassword) setShowPassword((s) => !s);
                        else setShowPasswordConfirm((s) => !s);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-zinc-700 hover:bg-zinc-100"
                      aria-label={
                        (isPassword ? showPassword : showPasswordConfirm)
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                      title={
                        (isPassword ? showPassword : showPasswordConfirm)
                          ? "Ocultar"
                          : "Mostrar"
                      }
                    >
                      {(isPassword ? showPassword : showPasswordConfirm) ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ) : k === "adminEmail" ? (
                  <input
                    className={"mt-1 " + inputBase}
                    value={form[k]}
                    onChange={(e) => {
                      set(k, e.target.value);
                      setErr(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={!!showFieldError}
                    aria-describedby={`${k}-error`}
                  />
                ) : k === "tenantSlug" ? (
                  <input
                    className={"mt-1 " + inputBase}
                    value={form.tenantSlug}
                    onChange={(e) => {
                      setSlugDirty(true);
                      set("tenantSlug", slugifyTyping(e.target.value)); // permite "-" no final enquanto digita
                      setErr(null);
                    }}
                    onBlur={() => {
                      setTouched((t) => ({ ...t, tenantSlug: true }));
                      set("tenantSlug", slugifyFinal(form.tenantSlug)); // remove "-" no final quando sair do campo
                    }}
                    type="text"
                    autoComplete="username"
                    aria-invalid={!!showFieldError}
                    aria-describedby={`tenantSlug-error`}
                  />
                ) : (
                  <input
                    className={"mt-1 " + inputBase}
                    value={form[k]}
                    onChange={(e) => {
                      set(k, e.target.value);
                      setErr(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
                    type="text"
                    aria-invalid={!!showFieldError}
                    aria-describedby={`${k}-error`}
                  />
                )}

                {k === "tenantSlug" && slugSuggestions.length >= 3 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slugSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="rounded-full border px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        onClick={() => {
                          set("tenantSlug", sug);
                          setSlugDirty(true); // escolheu manualmente
                          setTouched((t) => ({ ...t, tenantSlug: true }));
                        }}
                        title="Usar sugestão"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}

                {showFieldError && (
                  <div id={`${k}-error`} className="mt-1 text-xs text-red-600">
                    {showFieldError}
                  </div>
                )}

                {k === "tenantSlug" && !touched.tenantSlug && (
                  <div className="mt-1 text-xs text-zinc-500">
                    Dica: use letras minúsculas e hífen. Ex:{" "}
                    <span className="font-mono">studio-bela</span>
                  </div>
                )}
              </div>
            );
          })}

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={!canSubmit}
            className="w-full rounded-xl bg-zinc-900 text-white py-2 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar"}
          </button>

          <div className="text-sm text-zinc-600">
            Já tem conta?{" "}
            <Link className="underline" to="/admin/login">
              Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
