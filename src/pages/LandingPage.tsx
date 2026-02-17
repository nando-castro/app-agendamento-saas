import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type PlanKey = "basic" | "pro" | "business";

type Plan = {
  key: PlanKey;
  name: string;
  price: string;
  subtitle: string;
  highlighted?: boolean;
  features: string[];
};

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.3a1 1 0 0 1-1.42.002L3.296 9.21a1 1 0 1 1 1.414-1.414l3.086 3.086 6.493-6.585a1 1 0 0 1 1.415-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const plans: Plan[] = useMemo(
    () => [
      {
        key: "basic",
        name: "Básico",
        price: "R$ 29/mês",
        subtitle: "Para começar e organizar sua agenda.",
        features: [
          "1 profissional",
          "Até 200 agendamentos/mês",
          "Links públicos (geral)",
          "Serviços + horários + bloqueios",
          "Suporte por e-mail",
        ],
      },
      {
        key: "pro",
        name: "Pro",
        price: "R$ 59/mês",
        subtitle: "Para pequenas equipes e mais volume.",
        highlighted: true,
        features: [
          "Até 5 profissionais",
          "Até 1.000 agendamentos/mês",
          "Links por serviço + geral",
          "Relatórios básicos",
          "Suporte prioritário",
        ],
      },
      {
        key: "business",
        name: "Business",
        price: "R$ 129/mês",
        subtitle: "Para operação maior e controle avançado.",
        features: [
          "Até 20 profissionais",
          "Agendamentos avançados",
          "Permissões por usuário",
          "Exportações/relatórios avançados",
          "Onboarding e SLA",
        ],
      },
    ],
    [],
  );

  const goLogin = () => navigate("/admin/login");
  const goRegister = () => navigate("/admin/register");
  const goSubscribe = (plan: PlanKey) => navigate(`/subscribe?plan=${plan}`);

  return (
    <div className="h-dvh overflow-y-auto overflow-visible">
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-[-140px] right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_50%_0%,rgba(59,130,246,0.18),transparent)]" />
        </div>

        {/* Header */}
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="text-sm font-semibold tracking-tight">AS</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                Agendamentos SaaS
              </div>
              <div className="text-xs text-white/60">
                Agende. Organize. Cresça.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goLogin}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/5"
            >
              Entrar
            </button>
            <button
              onClick={goRegister}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
            >
              Criar conta
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Página pública + painel admin
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Um agendador moderno para{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                  serviços
                </span>{" "}
                e atendimentos
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
                Controle horários, bloqueios, serviços e links públicos para
                seus clientes agendarem com facilidade. Escolha um plano e
                comece hoje.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={goRegister}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90"
                >
                  Testar agora
                </button>
                <button
                  onClick={() => goSubscribe("pro")}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/5"
                >
                  Ver assinatura (Stripe)
                </button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Links públicos", value: "Rápido" },
                  { label: "Serviços", value: "Flexível" },
                  { label: "Agenda", value: "Organizada" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
                  >
                    <div className="text-xs text-white/60">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <div className="rounded-2xl bg-slate-950/40 p-5 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      Prévia do painel
                    </div>
                    <div className="text-xs text-white/60">
                      Dashboard, serviços, horários e links
                    </div>
                  </div>
                  <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                    v1
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  {[
                    "Cadastre serviços com duração e preço",
                    "Defina expediente e bloqueios",
                    "Compartilhe links públicos por serviço",
                    "Acompanhe agendamentos por período",
                  ].map((text) => (
                    <div
                      key={text}
                      className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
                    >
                      <CheckIcon className="mt-0.5 h-5 w-5 text-emerald-300" />
                      <div className="text-sm text-white/75">{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <section className="mt-16">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Planos
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  Valores provisórios. Você pode ajustar depois conforme seu
                  custo e mercado.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className={[
                    "relative rounded-3xl p-6 ring-1",
                    plan.highlighted
                      ? "bg-white/10 ring-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_120px_-40px_rgba(99,102,241,0.45)]"
                      : "bg-white/5 ring-white/10",
                  ].join(" ")}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 px-3 py-1 text-xs font-semibold text-slate-950">
                      Mais escolhido
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{plan.name}</div>
                      <div className="mt-1 text-sm text-white/65">
                        {plan.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline gap-2">
                    <div className="text-3xl font-semibold tracking-tight">
                      {plan.price}
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-white/70">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 h-5 w-5 text-emerald-300" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex gap-3">
                    <button
                      onClick={() => goSubscribe(plan.key)}
                      className={[
                        "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold",
                        plan.highlighted
                          ? "bg-white text-slate-950 hover:bg-white/90"
                          : "bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/10",
                      ].join(" ")}
                    >
                      Assinar
                    </button>
                    <button
                      onClick={goRegister}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                    >
                      Criar conta
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-white/50">
                    Cancelamento quando quiser.
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
            <div className="text-xs text-white/50">
              © {new Date().getFullYear()} Agendamentos SaaS. Todos os direitos
              reservados.
            </div>
            <div className="flex gap-4 text-xs text-white/60">
              <a
                className="hover:text-white"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Termos
              </a>
              <a
                className="hover:text-white"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Privacidade
              </a>
              <a
                className="hover:text-white"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Suporte
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
