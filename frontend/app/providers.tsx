"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  // Retry de 401 é tratado explicitamente por useSession (dança
  // me→refresh→me); o retry genérico do React Query não sabe fazer isso.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
