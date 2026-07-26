// Porta de CONSULTA VISUAL generica. Mesma fronteira do `ExtractorPort` e do
// `RedatorPort`: este arquivo e puro contrato, e so `adapters/` pode falar com
// SDK da AWS.
//
// O que ela e: "manda UMA imagem + UM texto ao modelo, devolve o texto da
// resposta". Utilitario de inspecao/bancada e candidato ao check qualitativo
// de layout (Could do SPEC) — a UNICA classe de tarefa visual em que o Bedrock
// segue elegivel depois das medicoes de 2026-07-25/26.
//
// O que ela NUNCA e: leitura de campo. A resposta daqui nao carrega confianca
// calibrada nem vinculo a evidencia, entao nao pode virar `valorLido`, nao
// entra na engine de conformidade e nao toca veredito (regra de ouro). Quem
// precisar LER numero usa o `ExtractorPort` (Textract).

/**
 * Token de injecao da consulta visual ativa. A escolha do driver mora na
 * factory (`adapters/consulta-visual.factory.ts`), nunca no consumidor.
 */
export const CONSULTA_VISUAL_PORT = 'CONSULTA_VISUAL_PORT';

export abstract class ConsultaVisualPort {
  /** 'bedrock' | 'mock' — aparece em log e na resposta da API. */
  abstract readonly nome: string;

  /** Identificacao do modelo usado; volta na resposta da API. */
  abstract readonly modelo: string;

  /**
   * Envia UMA imagem + UM texto ao modelo e devolve o texto da resposta.
   *
   * UMA chamada paga por invocacao, sem retry proprio e sem laco — a mesma
   * constraint 4 do SPEC que rege a visao. Quem dispara e o operador, nunca
   * um processo automatico.
   *
   * Falha da borda (mime nao suportado, resposta vazia, erro do servico)
   * estoura `Error` — nunca devolve string vazia fingindo sucesso.
   */
  abstract consultar(
    imagem: Buffer,
    mimeType: string,
    texto: string,
  ): Promise<string>;
}
