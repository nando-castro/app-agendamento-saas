import { createContext, useContext } from "react";

export type LoadingContextValue = {
  show: (label?: string) => void;
  hide: () => void;
  isLoading: boolean;
};

export const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}
