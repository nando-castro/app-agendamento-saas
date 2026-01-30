import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { setAdminToken } from '../../lib/storage';

export default function AdminRegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    tenantName: '',
    tenantSlug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAdminToken(data.accessToken);
      nav('/admin');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Falha no cadastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold">Criar Tenant + Admin</h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {(
            [
              ['tenantName', 'Nome do salão'],
              ['tenantSlug', 'Slug (ex: studio-bela)'],
              ['adminName', 'Nome do admin'],
              ['adminEmail', 'E-mail do admin'],
              ['adminPassword', 'Senha do admin'],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="text-sm">{label}</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                type={k === 'adminPassword' ? 'password' : 'text'}
              />
            </div>
          ))}

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 text-white py-2 disabled:opacity-60"
          >
            {loading ? 'Criando...' : 'Criar'}
          </button>
        </form>
      </div>
    </div>
  );
}
