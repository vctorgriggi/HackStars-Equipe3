// Tipos que ESPELHAM as respostas reais da API NestJS (fonte: classes com
// @ApiProperty do backend — transformadores/consultas/*, resumos
// compartilhados). Nada aqui é derivado no front: veredito e etapa chegam
// prontos (`vereditoVigente`/`etapaAtual` nascem na API — regra de ouro).
//
// Distintos do `Transformador` mock de ./types de propósito: o mock alimenta
// as telas ainda não integradas (tempo-real, dashboard); estes alimentam
// listagem/detalhe reais.

import type { Veredito } from "./types";

/** Rótulos dos vereditos da API — vocabulário do domínio TRAEL, não o mapa
 *  Aprovado/Reprovado dos reading states (que segue nas telas mock). */
export const VEREDITO_LABELS: Record<Veredito, string> = {
  conforme: "Conforme",
  divergente: "Divergente",
  nao_conferivel: "Não conferível",
};

export interface CheckpointResumoApi {
  /** Slug estável da etapa — gates casam por ele, nunca por nome/ordem. */
  codigo: string;
  nome: string;
}

export interface EtapaResumoApi extends CheckpointResumoApi {
  /** Posição na linha (1 = adesivação … 4 = fixação da placa). */
  ordem: number;
}

/** Uma conferência como o histórico e o veredito vigente a resumem. */
export interface ConferenciaResumoApi {
  /** Abra GET /conferencias/{id}/campos para o campo a campo com evidências. */
  id: string;
  /** Como a engine gravou; null = conferência sem veredito. */
  vereditoGeral: Veredito | null;
  createdAt: string;
  /** null = checklist inteira; preenchido = veredito PARCIAL de gate
   *  (conforme parcial NÃO atesta a peça completa — gap 14). */
  checkpoint: CheckpointResumoApi | null;
}

export interface PassagemResumoApi {
  id: string;
  createdAt: string;
  observacao: string | null;
  checkpoint: EtapaResumoApi;
}

export interface EtapaAtualApi {
  checkpoint: EtapaResumoApi;
  em: string;
}

/** Item de GET /transformadores: identidade enxuta + situação derivada. */
export interface TransformadorComSituacaoApi {
  id: string;
  numeroSerie: string;
  patrimonio: string;
  /** Texto do QR; string vazia quando a etiqueta não trouxe o dado. */
  cliente: string;
  pedido: string | null;
  seq: string | null;
  descricao: string | null;
  createdAt: string;
  projetoModelo: { codigo: string } | null;
  /** null = peça nunca conferida — estado legítimo, nunca inventar veredito. */
  vereditoVigente: ConferenciaResumoApi | null;
  /** null = peça sem passagem registrada. */
  etapaAtual: EtapaAtualApi | null;
}

/** Etapa real da linha (GET /checkpoints), para filtro e timeline prevista. */
export interface EtapaLinhaApi {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
}

/** Envelope do infinity pagination do backend. Atenção: `hasNextPage` é
 *  derivado de `data.length === limit` — página final cheia mente `true`. */
export interface PaginaApi<T> {
  data: T[];
  hasNextPage: boolean;
}
