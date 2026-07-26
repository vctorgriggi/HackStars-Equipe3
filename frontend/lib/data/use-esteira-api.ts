"use client";

// Snapshot da esteira para o dashboard, via react-query — NÃO reusa o store
// zustand de tempo-real: aquele é dirigido pelo socket driver e não tem
// isPending/isError/refetch para compor com o padrão das páginas. Aqui o
// snapshot estático basta (handler BFF e tipo já existiam).

import { useQuery } from "@tanstack/react-query";
import type { EsteiraSnapshotApi } from "@/lib/domain/esteira-api";
import { fetchJson } from "./http";
import { keys } from "./keys";

export function useEsteiraSnapshot() {
  return useQuery({
    queryKey: keys.esteiraApi.all,
    queryFn: () => fetchJson<EsteiraSnapshotApi>("/api/tempo-real/esteira"),
  });
}
