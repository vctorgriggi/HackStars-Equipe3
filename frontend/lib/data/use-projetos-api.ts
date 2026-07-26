"use client";

// Hook react-query sobre a API REAL de projetos-modelo. Chave própria (-api).

import { useQuery } from "@tanstack/react-query";
import { keys } from "./keys";
import { fetchProjetos } from "./projetos-api";

export function useProjetosApi() {
  return useQuery({
    queryKey: keys.projetosApi.all,
    queryFn: fetchProjetos,
  });
}
