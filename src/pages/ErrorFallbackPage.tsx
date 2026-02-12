// src/pages/ErrorFallbackPage.tsx (garante o tipo do props)
export default function ErrorFallbackPage({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-xl font-semibold">Ops… algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            {message ?? "O sistema pode estar fora do ar. Tente novamente."}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              className="h-10 rounded-xl bg-zinc-900 text-white px-4"
              onClick={() => (onRetry ? onRetry() : window.location.reload())}
            >
              Tentar novamente
            </button>
            <a className="h-10 rounded-xl border px-4 grid place-items-center" href="/">
              Ir para início
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
