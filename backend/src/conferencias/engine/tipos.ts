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
  /**
   * Fato registrado pelo chamador no dedupe: houve OUTRA leitura válida
   * (com valor e confiança >= limiar) discordando desta no valor
   * normalizado. A engine rebaixa o campo para `nao_conferivel`
   * (`leituras-conflitantes`) — escolher uma leitura calada poderia
   * rebaixar o cenário-âncora a `conforme` (achado ALTA da revisão).
   */
  conflitante?: boolean;
  /**
   * Fato registrado pelo chamador: o valor lido bate EXATAMENTE com o
   * esperado de OUTRO campo — sinal de que a foto mostrava mais de uma
   * marcação e o extrator casou a errada (patrimônio serigrafado lido como
   * série chumbada). A engine rebaixa para `nao_conferivel`
   * (`leitura-de-outro-campo`): é marcação do vizinho, não divergência da
   * peça.
   *
   * Só é marcado para leitura COM lastro (confiança >= limiar): sem lastro a
   * leitura não afirma nada, e o motivo honesto é `confianca-abaixo-do-limiar`
   * (achado A3 da revisão adversarial) — mandar o operador reenquadrar a foto
   * quando o problema é a foto ruim custa uma ida à peça por nada.
   */
  trocado?: boolean;
  /**
   * COM QUAL campo a leitura casou quando `trocado` é verdadeiro. Viaja até o
   * resultado porque é o que distingue os dois casos que o humano trata de
   * forma oposta: "a foto pegou a marcação vizinha" (reenquadrar) x "a peça foi
   * gravada com o número do campo vizinho" (não conformidade de verdade).
   */
  campoDaLeitura?: string;
  /**
   * Fato registrado pelo chamador: esta leitura é de marcação em RELEVO (o
   * número chumbado no metal) e, portanto, exige uma segunda evidência antes
   * de ACUSAR a peça. Ausente = não se aplica (tinta, impresso, digitado) e o
   * campo segue julgado como sempre — é o que preserva o cenário-âncora, em
   * que a placa IMPRESSA continua `divergente` com uma leitura só.
   *
   * `confirmada` = as releituras por recorte devolveram o mesmo valor;
   * `nao-confirmada` = não houve segunda evidência (ou ela contradisse, e aí o
   * `valorLido` já vem nulo). A regra que consome isto é
   * `engine/corroboracao.ts` — ela só REBAIXA `divergente`, nunca promove nada.
   */
  corroboracao?: 'confirmada' | 'nao-confirmada';
}

export interface OpcoesEngine {
  limiarConfianca: number; // parâmetro obrigatório — nunca constante enterrada
}

/**
 * Por que o campo NAO pode ser afirmado. União literal (e não string livre)
 * porque a conferência de coerência (`coerencia.ts`) LÊ este valor para
 * decidir quem entra na comparação entre campos irmãos: com union, renomear
 * um motivo sem atualizar a regra quebra a compilação; com `string`,
 * silenciaria a regra sem aviso.
 */
export type MotivoCampo =
  | 'sem-valor-esperado'
  | 'sem-leitura'
  | 'leituras-conflitantes'
  | 'leitura-de-outro-campo'
  | 'confianca-abaixo-do-limiar'
  /**
   * Marcação em relevo cuja leitura não tem segunda evidência: os recortes não
   * corroboraram, ou uma posição irmã leu outro número. Regra inteira (e o
   * argumento que a autoriza a rebaixar um `divergente`) em `corroboracao.ts`.
   */
  | 'leitura-nao-corroborada';

export interface ResultadoCampo {
  campo: string;
  fonteFisica: string;
  obrigatorio: boolean;
  valorEsperado: string | null;
  valorLido: string | null;
  confianca: number | null;
  veredito: Veredito;
  motivo?: MotivoCampo;
  /**
   * Presente apenas com `motivo: 'leitura-de-outro-campo'`: o campo cujo valor
   * esperado a leitura casou. Campo NOVO em vez de string livre no `motivo` —
   * `MotivoCampo` é união literal lida por `coerencia.ts`, e poluí-la quebraria
   * a regra que decide quem entra na comparação entre irmãos.
   *
   * Quando vários campos compartilham o mesmo valor esperado (as 3 chumbadas, os
   * dois patrimônios), representa o grupo o PRIMEIRO da checklist — mesma
   * convenção do "valor cru da primeira ocorrência" usada em `coerencia.ts`.
   */
  campoDaLeitura?: string;
}

/** Uma leitura que participou da comparação entre campos irmãos. */
export interface LeituraDoGrupo {
  campo: string;
  fonteFisica: string;
  /** Valor CRU lido nesta posição (a normalização é só da comparação). */
  valorLido: string;
  /**
   * Lastro da leitura. Vem junto de propósito: é com ele que o humano decide
   * qual posição re-inspecionar. O sistema não usa a confiança para eleger uma
   * "vencedora" — isso seria voto majoritário, e voto não aprova peça.
   */
  confianca: number | null;
  /** Veredito que ESTE campo já recebeu; a coerência não o reescreve. */
  veredito: Veredito;
}

/**
 * Campos que o QR manda carregar o MESMO valor (as 3 séries chumbadas + a da
 * placa; os patrimônios entre si) e que NÃO leram a mesma coisa.
 *
 * É informação derivada, nunca veredito de campo: o único efeito no veredito é
 * impedir o `conforme` geral (rebaixamento), nunca produzi-lo.
 */
export interface IncoerenciaEntreCampos {
  /** Valor único que o QR manda para todos os campos do grupo. */
  valorEsperado: string;
  /** Campos que produziram leitura comparável, em ordem de checklist. */
  campos: string[];
  /** Valores distintos lidos no grupo, em ordem de primeira aparição. */
  valoresLidos: string[];
  /** Cada leitura do grupo com seu lastro e o veredito do campo. */
  leituras: LeituraDoGrupo[];
}

export interface ResultadoConferencia {
  vereditoGeral: Veredito;
  campos: ResultadoCampo[];
  /** Vazio quando todo grupo de irmãos concordou (ou não há irmãos). */
  incoerencias: IncoerenciaEntreCampos[];
}
