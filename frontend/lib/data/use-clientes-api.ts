"use client";

// Hook react-query sobre a API REAL de clientes. Chave própria (-api) — o
// mock de clientes segue vivo em outras telas sem colisão de cache.

import { useQuery } from "@tanstack/react-query";
import { keys } from "./keys";
import { fetchClientes } from "./clientes-api";

export function useClientesApi() {
  return useQuery({
    queryKey: keys.clientesApi.all,
    queryFn: fetchClientes,
  });
}
