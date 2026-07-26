// Espelho manual de `ClienteComContadores` (backend,
// clientes/consultas/cliente-com-contadores.ts). Os contadores nascem na API
// — o front só renderiza (regra de ouro: dado derivado nasce na API).

export interface ClienteComContadoresApi {
  id: string;
  /** Nome único, como veio do QR (cadastro nasce por find-or-create
   *  server-side; a escrita HTTP de clientes é fechada). */
  nome: string;
  /** Peças (transformadores) vinculadas a este cliente. */
  totalPecas: number;
  /** Peças cujo veredito VIGENTE (última conferência) é `divergente`.
   *  Peça nunca conferida não conta; conforme de gate parcial não atesta a
   *  peça inteira (gap 14). */
  pecasDivergentes: number;
  createdAt: string;
  updatedAt: string;
}
