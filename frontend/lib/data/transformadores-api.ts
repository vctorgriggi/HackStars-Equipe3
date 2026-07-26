// Fetchers da API REAL de transformadores (via handlers BFF em /api/*).
// Aqui só se busca e se repassa: veredito, etapa e qualquer dado derivado
// chegam prontos da API — o front não compara nem recalcula nada.

import type {
  ConferenciaResumoApi,
  EtapaLinhaApi,
  PaginaApi,
  PassagemResumoApi,
  TransformadorComSituacaoApi,
} from "@/lib/domain/transformador-api";
import { fetchJson } from "./http";

// Teto do backend por página; o loop pára em hasNextPage=false OU página
// vazia (hasNextPage é derivado de data.length===limit e mente quando a
// última página vem cheia). Teto de páginas como guarda de sanidade.
const LIMITE_POR_PAGINA = 50;
const MAX_PAGINAS = 10;

async function buscarTodasAsPaginas<T>(baseUrl: string): Promise<T[]> {
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

export function fetchTransformadores(): Promise<TransformadorComSituacaoApi[]> {
  return buscarTodasAsPaginas<TransformadorComSituacaoApi>(
    "/api/transformadores",
  );
}

/** Resolve a peça pela chave de negócio. NUNCA use GET /:id para isso — o
 *  CRUD gerado devolve 200 com corpo vazio para id inexistente. */
export async function fetchTransformadorPorSerie(
  serie: string,
): Promise<TransformadorComSituacaoApi | null> {
  const pagina = await fetchJson<PaginaApi<TransformadorComSituacaoApi>>(
    `/api/transformadores?numeroSerie=${encodeURIComponent(serie)}&limit=1`,
  );
  return pagina.data[0] ?? null;
}

export function fetchPassagens(
  transformadorId: string,
): Promise<PassagemResumoApi[]> {
  return buscarTodasAsPaginas<PassagemResumoApi>(
    `/api/transformadores/${encodeURIComponent(transformadorId)}/passagens`,
  );
}

/** Lista simples (sem envelope), DESC — a primeira é o veredito vigente. */
export function fetchConferencias(
  transformadorId: string,
): Promise<ConferenciaResumoApi[]> {
  return fetchJson<ConferenciaResumoApi[]>(
    `/api/transformadores/${encodeURIComponent(transformadorId)}/conferencias?limit=50`,
  );
}

export async function fetchEtapasLinha(): Promise<EtapaLinhaApi[]> {
  const etapas = await buscarTodasAsPaginas<EtapaLinhaApi>("/api/checkpoints");
  return etapas.sort((a, b) => a.ordem - b.ordem);
}
