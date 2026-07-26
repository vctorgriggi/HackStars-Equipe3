// Fetchers da API REAL de lotes (via handler BFF /api/lotes).
// Contadores e progresso chegam prontos do servidor — nada é derivado aqui.

import type { LoteResumoApi } from "@/lib/domain/lote-api";
import { buscarTodasAsPaginas } from "./paginacao";

export function fetchLotes(): Promise<LoteResumoApi[]> {
  return buscarTodasAsPaginas<LoteResumoApi>("/api/lotes");
}
