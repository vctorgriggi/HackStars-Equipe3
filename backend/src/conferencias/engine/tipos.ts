// Tipos da engine de conformidade. Vocabulário de domínio em português sem
// acentos; uniões literais no lugar de enums (convenção do projeto).

export type Veredito = 'conforme' | 'divergente' | 'nao_conferivel';

export interface ItemChecklist {
  campo: string; // ex.: 'serie-placa'
  fonteFisica: string; // ex.: 'placa'
  obrigatorio: boolean;
  /**
   * Valor esperado DEFINIDO PELO MODELO, para marcação que não é identidade da
   * peça. Opcional: item sem a chave segue resolvendo o esperado pela origem do
   * prefixo (o QR), exatamente como antes.
   *
   * POR QUE ISTO NÃO FERE A CONSTRAINT 5 DO SPEC (2026-07-26): a fonte da
   * verdade única é da IDENTIDADE — série, patrimônio e cliente continuam
   * vindo EXCLUSIVAMENTE do payload do QR, e nenhum campo desses aceita este
   * valor no seed. Potência é outra coisa: ela não identifica a peça, não viaja
   * em campo do QR, e quem a define é o DESENHO do modelo (EPT-163-PI-676 pede
   * `1H - 10 kVA` na frente — confirmado no desenho pelo time em 2026-07-26).
   * O ProjetoModelo é justamente o desenho virado dado, então tirar o esperado
   * dele é ler a fonte certa, não inventar valor.
   *
   * Por que vale a pena: sem esperado, a engine OMITIA o campo opcional e a
   * marcação errada saía em silêncio — e marcação errada é o que o avaliador vai
   * testar. Com esperado, `2H - 10 kVA` na peça vira `divergente`.
   *
   * A engine NÃO lê esta chave: quem a transforma em valor esperado é o
   * chamador (`montarValoresEsperados`), no mesmo lugar em que resolve o
   * esperado do QR. A engine continua recebendo apenas
   * `Record<campo, valorEsperado>`.
   */
  esperadoFixo?: string;
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

/**
 * CRITERIO DE IGUALDADE TEXTUAL de um campo. Como o limiar, e POLITICA — entra
 * por parametro, nunca por constante (nem por dedução dentro da engine: quem
 * conhece prefixo de campo é o chamador).
 *
 * - `exato` (default): igualdade do valor normalizado. Vale para TODO
 *   identificador — em número de série, "quase igual" é divergente.
 * - `contem-token`: o lido é um TOKEN INTEIRO (ou uma sequência de tokens
 *   inteiros consecutivos) do esperado, comparando sem acento e sem caixa.
 *   Existe por medição (2026-07-26, gap 21): a serigrafia carrega a MARCA
 *   (`Energisa`) e o QR carrega a razão social com código
 *   (`143091 - Energisa Rondônia ...`), então a igualdade exata acusava a peça
 *   CORRETA. Não é fuzzy match: pedaço de palavra (`ener`) continua divergente
 *   e a contenção vale num sentido só (lido dentro do esperado).
 * - `esperado-contido`: o INVERSO de `contem-token` — o esperado inteiro tem de
 *   aparecer como sequência de tokens consecutivos DENTRO do lido. Existe para
 *   a marcação que o desenho manda gravar junto de outro texto na mesma face:
 *   o projeto pede `1H - 10 kVA` e a serigrafia é lida numa tirada só, então o
 *   lido pode trazer companhia (`1H - 10 kVA 15 kV`). Continua não sendo fuzzy:
 *   `2H - 10 kVA` e `1H - 20 kVA` são DIVERGENTES (o esperado não está lá), e
 *   `10 kVA` sozinho também (falta o `1H` que o desenho pede). É o modo mais
 *   frouxo da engine e por isso vale só para campo que NÃO é identidade da peça
 *   — a decisão é do chamador, em `ORIGENS_DO_ESPERADO`.
 */
export type ModoComparacao = 'exato' | 'contem-token' | 'esperado-contido';

export interface OpcoesEngine {
  limiarConfianca: number; // parâmetro obrigatório — nunca constante enterrada
  /**
   * Modo de comparação POR CAMPO. Campo ausente do mapa (ou mapa ausente) usa
   * `exato` — o default preserva o comportamento de todo campo que o chamador
   * não classificou.
   */
  modosPorCampo?: Record<string, ModoComparacao>;
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
