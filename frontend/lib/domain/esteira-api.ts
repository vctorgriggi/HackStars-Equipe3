// Tipos que ESPELHAM o contrato de tempo real da API NestJS (fonte: classes
// com @ApiProperty em backend/src/tempo-real/dto/* e
// passagens/dto/resultado-registro-passagem.dto.ts). Nada aqui é derivado no
// front: totais e checkpoint anterior chegam prontos — regra de ouro.

import type { ConferenciaResumoApi, EtapaResumoApi } from "./transformador-api";

/** A passagem recém-gravada, como o `POST /passagens/registrar` responde. */
export interface PassagemRegistradaApi {
  id: string;
  createdAt: string;
  observacao: string | null;
}

export interface ResultadoRegistroPassagemApi {
  passagem: PassagemRegistradaApi;
  checkpoint: EtapaResumoApi;
  transformador: {
    id: string;
    numeroSerie: string;
    patrimonio: string;
    cliente: string;
  };
  /** Dado do ALERTA (critério 6): null = peça nunca conferida. */
  ultimaConferencia: ConferenciaResumoApi | null;
}

export interface TotalDoCheckpointApi {
  /** Slug estável — o front casa por ele, nunca por nome/ordem. */
  codigo: string;
  /** Peças cuja ÚLTIMA passagem foi neste checkpoint. */
  total: number;
}

/** Evento Socket.IO `passagem-registrada` (namespace `/tempo-real`). */
export interface EventoPassagemRegistradaApi {
  resultado: ResultadoRegistroPassagemApi;
  /** Posição ANTES desta passagem; null = peça entrando na linha. É o `from`
   *  da animação — server-authoritative, o estado local pode ter perdido
   *  eventos. */
  checkpointAnterior: EtapaResumoApi | null;
  /** Totais de TODOS os checkpoints, recalculados após a escrita. O cliente
   *  SUBSTITUI os seus, nunca incrementa. */
  totais: TotalDoCheckpointApi[];
}

// ---- Snapshot GET /api/v1/tempo-real/esteira (via BFF) ----

export interface PecaNaEsteiraApi {
  numeroSerie: string;
  patrimonio: string | null;
  /** ISO da passagem que define a posição. */
  em: string;
}

export interface OcupacaoCheckpointApi extends EtapaResumoApi {
  total: number;
  pecas: PecaNaEsteiraApi[];
}

export interface EsteiraSnapshotApi {
  /** Ordenado por `ordem`; checkpoint vazio APARECE com total 0. */
  checkpoints: OcupacaoCheckpointApi[];
  totalNaLinha: number;
  geradoEm: string;
}
