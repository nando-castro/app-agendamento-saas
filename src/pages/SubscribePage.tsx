import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type PlanKey = "basic" | "pro" | "business";

const planLabel: Record<PlanKey, string> = {
  basic: "Básico",
  pro: "Pro",
  business: "Business",
};

export default function SubscribePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const plan = useMemo(() => {
    const p = (params.get("plan") || "pro") as PlanKey;
    return (["basic", "pro", "business"].includes(p) ? p : "pro") as PlanKey;
  }, [params]);

  async function handleCheckout() {
    setLoading(true);

    // TODO: aqui você vai chamar seu backend:
    // POST /api/billing/checkout { plan }
    // e redirecionar para o session.url retornado.
    // Exemplo futuro:
    // const { url } = await fetch(...).then(r => r.json());
    // window.location.href = url;

    setTimeout(() => {
      setLoading(false);
      alert(`Stripe Checkout (placeholder) - plano: ${plan}`);
    }, 700);
  }

  return (
    <div className="h-dvh overflow-y-auto overflow-visible">
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <button
            onClick={() => navigate("/")}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/5"
          >
            Voltar
          </button>

          <div className="mt-8 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <h1 className="text-2xl font-semibold">Assinatura</h1>
            <p className="mt-2 text-white/70">
              Você está assinando o plano{" "}
              <span className="font-semibold text-white">
                {planLabel[plan]}
              </span>
              .
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={loading}
                onClick={handleCheckout}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90 disabled:opacity-60"
              >
                {loading ? "Abrindo Stripe..." : "Ir para pagamento (Stripe)"}
              </button>

              <button
                onClick={() => navigate("/admin/register")}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white/90 ring-1 ring-white/15 hover:bg-white/5"
              >
                Criar conta
              </button>

              <button
                onClick={() => navigate("/admin/login")}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white/90 ring-1 ring-white/15 hover:bg-white/5"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
