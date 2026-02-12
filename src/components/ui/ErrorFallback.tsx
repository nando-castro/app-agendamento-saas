import ErrorFallbackPage from "@/pages/ErrorFallbackPage";
import type { FallbackProps } from "react-error-boundary";

export default function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <ErrorFallbackPage
      message={error instanceof Error ? error.message : "Erro inesperado."}
      onRetry={resetErrorBoundary}
    />
  );
}
