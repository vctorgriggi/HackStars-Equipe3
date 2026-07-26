// Porta de REDACAO de laudo. Mesma fronteira do `ExtractorPort`: este arquivo
// e puro contrato, e so `adapters/` pode falar com SDK da AWS.
//
// REGRA DE OURO (a mesma da extracao, aplicada a um segundo tipo de borda): o
// redator NAO DECIDE NADA. Ele recebe FATOS JA DECIDIDOS pela engine e devolve
// PROSA sobre eles. Nao compara campo, nao reclassifica veredito, nao suaviza
// divergencia e nao completa lacuna — se o texto que ele produz discordar de
// `FatosDoLaudo`, o texto e que esta errado, nunca o veredito.
//
// Por que a fronteira e essa: um laudo redigido por LLM e exatamente o lugar
// onde um "conforme" alucinado seria mais convincente e mais caro. Mantendo a
// entrada como estrutura fechada (e nao "o payload da conferencia"), o modelo
// nao tem de onde inventar numero que o banco nao tem.

/**
 * Um campo comparado, do jeito que a engine GRAVOU. Espelha o que
 * `GET /conferencias/:id/campos` devolve — nem mais, nem menos.
 *
 * NAO tem `motivo` de proposito (gap 22 do CLAUDE.md): o porque do veredito nao
 * e persistido, entao o laudo tambem nao pode falar dele. Passar o motivo aqui
 * exigiria recalcula-lo na leitura — a engine rodando duas vezes, com duas
 * chances de divergir.
 */
export interface CampoDoLaudo {
  campo: string;
  /** `conforme` | `divergente` | `nao_conferivel`; `null` = linha sem veredito. */
  veredito: string | null;
  /** O que a etiqueta (QR) mandava. String vazia quando nao havia esperado. */
  valorEsperado: string;
  /** O que a visao leu; `null` quando nao houve leitura. */
  valorLido: string | null;
  /** Score 0..1 da leitura que lastreou o veredito. */
  confianca: number | null;
}

/** Quantos campos caíram em cada veredito. Aritmética, não julgamento. */
export interface ContagensDoLaudo {
  total: number;
  conformes: number;
  divergentes: number;
  naoConferiveis: number;
  /** Linhas gravadas sem veredito reconhecido — contadas, nunca escondidas. */
  semVeredito: number;
}

/** A identidade esperada da peca, como veio do QR e ficou no banco. */
export interface PecaDoLaudo {
  numeroSerie: string;
  patrimonio: string;
  cliente: string;
}

/**
 * O pacote fechado de fatos que o redator pode usar. Tudo que nao esta aqui,
 * ele nao sabe — e o prompt proibe supor.
 */
export interface FatosDoLaudo {
  peca: PecaDoLaudo;
  /**
   * Nome legivel da etapa em que o veredito saiu, ou `null` para a checklist
   * inteira. Viaja porque `conforme` de gate parcial NAO atesta a peca inteira
   * (gap 14): o laudo tem de dizer qual recorte foi avaliado.
   */
  etapaAvaliada: string | null;
  /** Veredito agregado que a engine gravou. `null` = linha sem veredito. */
  vereditoGeral: string | null;
  campos: CampoDoLaudo[];
  contagens: ContagensDoLaudo;
  /** Excecao aceita pelo time, quando alguem registrou uma. */
  observacao: string | null;
  /** Quando a conferencia foi executada (ISO 8601). */
  conferidaEm: string;
}

/**
 * Frase obrigatoria no FIM de todo laudo. Fica no codigo, e nao so no prompt,
 * porque o prompt e uma sugestao ao modelo e isto e um requisito: o service
 * carimba a frase quando o modelo a esquece.
 */
export const DISCLAIMER_LAUDO =
  'Laudo redigido por IA a partir do veredito da engine — não substitui o veredito.';

/**
 * Token de injecao do redator ativo. A escolha do driver mora na factory
 * (`adapters/redator.factory.ts`), nunca no consumidor.
 */
export const REDATOR_PORT = 'REDATOR_PORT';

export abstract class RedatorPort {
  /** 'bedrock' | 'mock' — aparece em log. */
  abstract readonly nome: string;

  /** Identificacao do modelo usado; volta na resposta da API. */
  abstract readonly modelo: string;

  /**
   * UMA chamada paga por invocacao, sem retry proprio e sem laco — a mesma
   * constraint 4 do SPEC que rege a visao. Quem dispara e o operador clicando
   * "gerar laudo"; nada aqui roda sozinho.
   *
   * Falha da borda estoura `Error` — nunca devolve texto vazio fingindo
   * sucesso. Laudo em branco na tela seria lido como "nada a relatar".
   */
  abstract redigirLaudo(fatos: FatosDoLaudo): Promise<string>;
}
