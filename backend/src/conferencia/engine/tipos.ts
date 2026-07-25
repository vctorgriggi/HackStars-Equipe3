// Tipos da engine de conformidade. Vocabulário de domínio em português sem
// acentos; uniões literais no lugar de enums (convenção do projeto).

export type Veredito = 'conforme' | 'divergente' | 'nao_conferivel';

export interface ItemChecklist {
  campo: string; // ex.: 'serie-placa'
  fonteFisica: string; // ex.: 'placa'
  obrigatorio: boolean;
  /**
   * `codigo` do Checkpoint em que a marcação passa a existir fisicamente na
   * peça — a partir dele o campo é conferível. Usado FORA da engine, pelo
   * chamador, para recortar a checklist por etapa (conferência parcial); a
   * engine só compara o que recebe e ignora este dado.
   *
   * Opcional de propósito: item SEM `etapa` é sempre avaliado, em qualquer
   * gate — é o que mantém compatível a checklist antiga (sem o campo) e a de
   * modelos cujo fluxo ainda não foi mapeado.
   */
  etapa?: string;
}

export interface LeituraCampo {
  campo: string;
  valorLido: string | null;
  confianca: number | null; // 0..1
  regiaoLeitura?: string | null;
  fotoEvidenciaId?: string | null;
}

export interface OpcoesEngine {
  limiarConfianca: number; // parâmetro obrigatório — nunca constante enterrada
}

export interface ResultadoCampo {
  campo: string;
  fonteFisica: string;
  obrigatorio: boolean;
  valorEsperado: string | null;
  valorLido: string | null;
  confianca: number | null;
  veredito: Veredito;
  motivo?: string; // ex.: 'sem-leitura', 'confianca-abaixo-do-limiar', 'sem-valor-esperado'
}

export interface ResultadoConferencia {
  vereditoGeral: Veredito;
  campos: ResultadoCampo[];
}
