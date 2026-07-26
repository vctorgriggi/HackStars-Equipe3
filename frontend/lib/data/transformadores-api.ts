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
import { buscarTodasAsPaginas } from "./paginacao";

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
