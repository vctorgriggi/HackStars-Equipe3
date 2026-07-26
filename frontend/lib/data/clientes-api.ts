// Fetchers da API REAL de clientes (via handler BFF /api/clientes).
// Contadores chegam prontos do servidor — nada é derivado aqui.

import type { ClienteComContadoresApi } from "@/lib/domain/cliente-api";
import { buscarTodasAsPaginas } from "./paginacao";

export function fetchClientes(): Promise<ClienteComContadoresApi[]> {
  return buscarTodasAsPaginas<ClienteComContadoresApi>("/api/clientes");
}
