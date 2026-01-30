import axios from "axios";

export function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message ?? "Falha ao processar a requisição.";
  }
  if (e instanceof Error) return e.message;
  return "Erro inesperado.";
}
