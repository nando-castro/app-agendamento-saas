import { useLoading } from "@/lib/loading";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
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

export default function AdminRegisterPage() {
  const nav = useNavigate();
  const { show, hide } = useLoading();

  const [form, setForm] = useState({
    tenantName: "",
    tenantSlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // mantém só pra desabilitar botão/label
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    show("Criando conta...");

    try {
      const { data } = await api.post("/auth/register", form);
      setAdminToken(data.accessToken);
      nav("/admin", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha no cadastro.");
    } finally {
      hide();
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold">Criar conta</h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {(
            [
              ["tenantName", "Nome do negócio (ex: Studio Bela)"],
              ["tenantSlug", "Nome de usuário (ex: studio-bela)"],
              ["adminName", "Nome do administrador"],
              ["adminEmail", "E-mail do administrador"],
              ["adminPassword", "Senha do administrador"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="text-sm">{label}</label>

              {k === "adminPassword" ? (
                <div className="mt-1 relative">
                  <input
                    className="w-full rounded-xl border px-3 py-2 pr-11"
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-zinc-700 hover:bg-zinc-100"
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
              ) : (
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  type="text"
                />
              )}
            </div>
          ))}

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={loading}
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
