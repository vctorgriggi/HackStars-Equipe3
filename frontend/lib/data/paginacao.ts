// Varredura do infinity pagination do backend, extraída de
// transformadores-api quando clientes/projetos/câmeras viraram o 3º
// consumidor. O loop pára em hasNextPage=false OU página vazia (hasNextPage
// é derivado de data.length===limit e mente quando a última página vem
// cheia). Teto de páginas como guarda de sanidade.

import type { PaginaApi } from "@/lib/domain/transformador-api";
import { fetchJson } from "./http";

const LIMITE_POR_PAGINA = 50;
const MAX_PAGINAS = 10;

export async function buscarTodasAsPaginas<T>(baseUrl: string): Promise<T[]> {
  const itens: T[] = [];
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const separador = baseUrl.includes("?") ? "&" : "?";
    const pagina = await fetchJson<PaginaApi<T>>(
      `${baseUrl}${separador}page=${page}&limit=${LIMITE_POR_PAGINA}`,
    );
    itens.push(...pagina.data);
    if (!pagina.hasNextPage || pagina.data.length === 0) break;
  }
  return itens;
}
