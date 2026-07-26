"use client";

// Hook react-query sobre a API REAL de lotes.

import { useQuery } from "@tanstack/react-query";
import { keys } from "./keys";
import { fetchLotes } from "./lotes-api";

export function useLotesApi() {
  return useQuery({
    queryKey: keys.lotesApi.all,
    queryFn: fetchLotes,
  });
}
