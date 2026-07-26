// Tipos que ESPELHAM as respostas reais da API NestJS (fonte: classes com
// @ApiProperty do backend — transformadores/consultas/*, resumos
// compartilhados). Nada aqui é derivado no front: veredito e etapa chegam
// prontos (`vereditoVigente`/`etapaAtual` nascem na API — regra de ouro).
//
// O `Transformador` mock que coexistia em ./types foi removido junto com as
// últimas telas mockadas (dashboard/alertas, 2026-07-26).

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
  /** Conferência que COMPROVOU esta passagem (gate da estação: registro
   *  automático no `conforme`, ou liberação com exceção — aí `observacao`
   *  traz a justificativa). `null` = scan avulso, sem vínculo. */
  conferencia: ConferenciaResumoApi | null;
}

/** Foto-evidência com URL PRONTA (assinada, expira em 1h — nunca persistir). */
export interface FotoDaEvidenciaApi {
  id: string;
  url: string;
  fonteFisica: string;
}

/** Um campo como o banco gravou (GET /conferencias/{id}/campos). O front
 *  nunca compara `valorEsperado` × `valorLido` — a cor sai de `veredito`. */
export interface CampoVereditoApi {
  id: string;
  campo: string;
  /** Re-resolvida da checklist do projeto; `null` = não resolvida. */
  fonteFisica: string | null;
  obrigatorio: boolean | null;
  /** String VAZIA (não null) quando o QR não trazia o dado. */
  valorEsperado: string;
  valorLido: string | null;
  confianca: number | null;
  veredito: Veredito | null;
  /** JSON `{Left,Top,Width,Height}` em frações 0..1, quando o extrator deu. */
  regiaoLeitura: string | null;
  fotoEvidencia: FotoDaEvidenciaApi | null;
}

export interface ConferenciaDoVereditoApi {
  id: string;
  vereditoGeral: Veredito | null;
  createdAt: string;
  observacao: string | null;
  checkpoint: EtapaResumoApi | null;
}

/** Releitura completa: GET /conferencias/{id}/campos. */
export interface VereditoConferenciaApi {
  conferencia: ConferenciaDoVereditoApi;
  transformador: {
    id: string;
    numeroSerie: string;
    patrimonio: string;
    cliente: string;
  };
  campos: CampoVereditoApi[];
}

/**
 * Bounding box `{Left,Top,Width,Height}` (frações 0..1) → porcentagens CSS.
 * Formato inesperado devolve `null` e a foto aparece sem destaque — nunca
 * derruba a tela que mostra a não conformidade.
 */
export function interpretarRegiaoLeitura(
  regiao: string | null | undefined,
): { left: number; top: number; width: number; height: number } | null {
  if (!regiao) return null;
  try {
    const caixa = JSON.parse(regiao) as Record<string, unknown>;
    const numeros = [caixa.Left, caixa.Top, caixa.Width, caixa.Height];
    if (numeros.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
      return null;
    }
    return {
      left: (caixa.Left as number) * 100,
      top: (caixa.Top as number) * 100,
      width: (caixa.Width as number) * 100,
      height: (caixa.Height as number) * 100,
    };
  } catch {
    return null;
  }
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
