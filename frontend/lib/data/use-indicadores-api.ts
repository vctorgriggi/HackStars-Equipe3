"use client";

// Hook react-query sobre a API REAL de indicadores (dashboard + banner de
// alertas). Resposta é objeto único — nada de buscarTodasAsPaginas.

import { useQuery } from "@tanstack/react-query";
import type { IndicadoresApi } from "@/lib/domain/indicadores-api";
import { fetchJson } from "./http";
import { keys } from "./keys";

export function useIndicadoresApi() {
  return useQuery({
    queryKey: keys.indicadoresApi.all,
    queryFn: () => fetchJson<IndicadoresApi>("/api/conferencias/indicadores"),
  });
}
