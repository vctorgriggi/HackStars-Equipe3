// Fetchers da API REAL de projetos-modelo (via handler BFF
// /api/projetos-modelo). Contadores chegam prontos do servidor.

import type { ProjetoModeloComContadoresApi } from "@/lib/domain/projeto-api";
import { buscarTodasAsPaginas } from "./paginacao";

export function fetchProjetos(): Promise<ProjetoModeloComContadoresApi[]> {
  return buscarTodasAsPaginas<ProjetoModeloComContadoresApi>(
    "/api/projetos-modelo",
  );
}
