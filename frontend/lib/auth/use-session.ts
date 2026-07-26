"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "./types";

// Sessão deslogada é um resultado válido (null), não um erro — importante
// para o React Query não tratar como falha e reagir com retry/loading
// indevidos.
async function fetchSession(): Promise<SessionUser | null> {
  const meResponse = await fetch("/api/auth/me");
  if (meResponse.ok) return meResponse.json();
  if (meResponse.status !== 401) return null;

  const refreshResponse = await fetch("/api/auth/refresh", { method: "POST" });
  if (!refreshResponse.ok) return null;

  const retryResponse = await fetch("/api/auth/me");
  if (!retryResponse.ok) return null;
  return retryResponse.json();
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });
}
