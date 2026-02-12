import GlobalLoader from "@/components/ui/GlobalLoader";
import React, { useMemo, useState } from "react";
import { LoadingContext, type LoadingContextValue } from "./loadingContext";

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const value = useMemo<LoadingContextValue>(
    () => ({
      show: (l) => {
        setLabel(l);
        setIsLoading(true);
      },
      hide: () => {
        setIsLoading(false);
        setLabel(undefined);
      },
      isLoading,
    }),
    [isLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading ? <GlobalLoader label={label} /> : null}
    </LoadingContext.Provider>
  );
}
