// Espelho manual de `LoteResumo` (backend,
// transformadores/consultas/lote-resumo.ts). Lote não é entidade: é o
// recorte das peças pelo `pedido` do QR — a chave é o texto do pedido.
// Contadores e progresso nascem na API — o front só renderiza (regra de
// ouro: dado derivado nasce na API).

export interface LoteResumoApi {
  /** O pedido como veio na identidade da peça — a chave do lote. */
  pedido: string;
  /** Peças (transformadores) com este pedido. */
  totalPecas: number;
  /** Peças cujo veredito VIGENTE (última conferência) é `divergente`.
   *  Peça nunca conferida não conta; gate parcial não atesta a peça
   *  inteira (gap 14). */
  pecasDivergentes: number;
  /** Cliente do lote; `null` quando misto ou ausente — ausência se anuncia,
   *  nunca se elege um em silêncio. */
  cliente: string | null;
  /** Código do ProjetoModelo quando único no lote; `null` misto/sem vínculo. */
  projetoCodigo: string | null;
  /** Progresso de TRÂNSITO 0–100 (posição na esteira, derivado da última
   *  passagem por peça) — NÃO é atestado de conformidade. */
  progressoPct: number;
}
