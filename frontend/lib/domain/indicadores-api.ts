// Tipos que ESPELHAM a resposta real de GET /conferencias/indicadores
// (fonte: backend/src/conferencias/dto/indicadores.dto.ts). Nada aqui é
// derivado no front: cada número é COUNT(*) sobre vereditos que a engine já
// gravou — a rota não compara, não escreve e não recalcula (regra de ouro).

import type { CheckpointResumoApi, EtapaResumoApi } from "./transformador-api";

export interface TotaisIndicadoresApi {
  /** Conferências existentes, com ou sem veredito. É o denominador honesto:
   *  `divergentes + naoConferiveis + conformes` pode ser MENOR (linha crua do
   *  CRUD não tem veredito, e veredito desconhecido não entra em balde). */
  conferencias: number;
  divergentes: number;
  /** A API se recusou a afirmar — foto/leitura sem lastro esperando olho
   *  humano, não sinônimo de peça ruim. */
  naoConferiveis: number;
  /** Leia junto da etapa: conforme de gate parcial não atesta a peça
   *  inteira (gap 14). */
  conformes: number;
  /** Transformadores cadastrados — conta TODOS, mesmo os que o teto de
   *  `linha` deixou de fora. */
  pecas: number;
  passagens: number;
}

/** Divergências (e o resto) de UMA etapa — o "onde dói". */
export interface IndicadorPorEtapaApi {
  /** `null` agrupa as conferências SEM checkpoint (peça inteira); vem por
   *  último na lista de propósito. */
  etapa: EtapaResumoApi | null;
  divergentes: number;
  naoConferiveis: number;
  conformes: number;
}

/** O "quais campos mais dão problema", agregado sobre campo_conferido. */
export interface IndicadorPorCampoApi {
  /** Nome como a conferência gravou (serie-placa, serie-chumbada-topo…). */
  campo: string;
  divergentes: number;
  /** Alto aqui costuma ser problema de CAPTURA, não de peça. */
  naoConferiveis: number;
  conformes: number;
}

export interface UltimaPassagemNaLinhaApi {
  checkpoint: CheckpointResumoApi;
  em: string;
}

export interface UltimaConferenciaNaLinhaApi {
  /** Exatamente como está no banco — o backend tipa `string | null`, então
   *  filtre por whitelist dos 3 vereditos antes de indexar mapas; valor
   *  desconhecido é ignorado, nunca estoura. `conforme` COM etapa atesta só
   *  aquele gate (gap 14) — exibir um sem o outro produz falso OK. */
  veredito: string | null;
  /** null = conferência da checklist inteira. */
  etapa: EtapaResumoApi | null;
  em: string;
}

/** Uma linha do dashboard: peça × onde está × como está. */
export interface PecaNaLinhaApi {
  transformadorId: string;
  numeroSerie: string;
  patrimonio: string | null;
  /** null = peça cadastrada por conferência, sem passagem ainda. */
  ultimaPassagem: UltimaPassagemNaLinhaApi | null;
  /** null = peça nunca conferida — ausência de conferência, NÃO "sem
   *  problema"; a tela precisa dizer isso com todas as letras. */
  ultimaConferencia: UltimaConferenciaNaLinhaApi | null;
}

export interface IndicadoresApi {
  totais: TotaisIndicadoresApi;
  /** Ordem da linha (`ordem` asc); o grupo `etapa: null` fecha a lista. */
  porEtapa: IndicadorPorEtapaApi[];
  /** ORDEM É CONTRATO: divergentes desc, naoConferiveis desc, nome — o topo
   *  é onde investigar primeiro. O front NÃO reordena. */
  porCampo: IndicadorPorCampoApi[];
  /** Teto de 200 peças, SEM paginação (volume de demo). `totais.pecas` conta
   *  todas — maior que `linha.length` significa corte, e a tela deve dizer. */
  linha: PecaNaLinhaApi[];
}
