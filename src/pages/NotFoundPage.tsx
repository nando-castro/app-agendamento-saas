// src/pages/NotFoundPage.tsx
import animationData from "@/assets/lotties/404.json";
import Lottie from "lottie-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // opcional: log/telemetria
    // console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-full max-w-sm">
            <Lottie animationData={animationData} loop />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Página não encontrada</h1>
            <p className="text-sm text-muted-foreground">
              Não encontramos{" "}
              <span className="font-mono">{location.pathname}</span>. Verifique
              o endereço ou volte para o início.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              className="h-10 rounded-xl bg-zinc-900 text-white px-4"
              onClick={() => nav("/")}
            >
              Ir para início
            </button>
            <button
              className="h-10 rounded-xl border px-4"
              onClick={() => nav(-1)}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
