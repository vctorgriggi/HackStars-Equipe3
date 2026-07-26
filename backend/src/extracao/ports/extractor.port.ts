// Porta de extracao por visao. Vocabulario de dominio em portugues sem
// acentos; uniao literal no lugar de enum (convencao do projeto).
//
// REGRA DE OURO: este arquivo (e o modulo `extracao/` inteiro) e o unico lugar
// do backend que pode falar com SDK da AWS — e mesmo assim so dentro de
// `adapters/`. Nada aqui importa SDK: a porta e puro contrato.
//
// REGRA DE OURO 2: toda leitura sai com `confianca` e `fotoEvidenciaId`. Um
// extrator NUNCA decide veredito — quem decide e a engine de conformidade
// (`src/conferencias/engine`). Leitura sem lastro (confianca null ou baixa)
// chega la e vira `nao_conferivel`, nunca `conforme`.

/**
 * Valores canonicos de `fonteFisica`. Casam com `FotoEvidencia.fonteFisica` e
 * com o campo homonimo do checklist do ProjetoModelo.
 */
export type FonteFisica =
  | 'placa'
  | 'serigrafia'
  | 'chumbado-1'
  | 'chumbado-2'
  | 'chumbado-3'
  | 'geral';

export const FONTES_FISICAS: FonteFisica[] = [
  'placa',
  'serigrafia',
  'chumbado-1',
  'chumbado-2',
  'chumbado-3',
  'geral',
];

/**
 * Uma foto pronta para extracao. `fonteFisica` fica como `string` (e nao
 * `FonteFisica`) de proposito: a foto vem do banco, onde a coluna e texto
 * livre; estreitar o tipo aqui esconderia dado sujo em vez de trata-lo.
 */
export interface FonteImagem {
  fotoEvidenciaId: string | null;
  fonteFisica: string;
  imagem: Buffer;
  mimeType: string;
}

/** Campo da checklist cuja `fonteFisica` casa com a da foto. */
export interface CampoAlvo {
  campo: string;
}

/**
 * Leitura crua produzida por um adapter. Alimenta `LeituraCampo` da engine.
 * `confianca` e 0..1 (null = sem lastro). `regiaoLeitura` e opaco para o
 * dominio: hoje e o bounding box do Textract serializado em JSON.
 */
export interface LeituraExtraida {
  campo: string;
  valorLido: string | null;
  confianca: number | null;
  regiaoLeitura: string | null;
  fotoEvidenciaId: string | null;
}

/**
 * Texto que o servico de visao leu na foto e que NAO virou leitura de campo
 * alvo. Materia-prima da conferencia de consistencia (SPEC, Could): o Textract
 * ja devolve a foto inteira e o adapter descartava o resto — reaproveitar custa
 * ZERO chamada AWS a mais.
 *
 * Nao tem `campo` de proposito: achado livre nao pertence a checklist nenhuma.
 * Ele so ALERTA (cruzamento contra os valores do QR); veredito continua
 * nascendo exclusivamente da checklist, na engine.
 */
export interface AchadoLivre {
  /** Texto cru da linha lida, sem normalizacao. */
  texto: string;
  /**
   * 0..1. Bloco sem confianca informada entra com 0: alarme e informativo e
   * nunca vira veredito, e o 0 diz "sem lastro" a quem le.
   */
  confianca: number;
  regiaoLeitura?: string | null;
  fotoEvidenciaId?: string | null;
}

/**
 * O que uma extracao produz: as leituras dos campos alvo (o que a engine
 * julga) e os achados livres (o que so alerta). Objeto em vez de array porque
 * o segundo canal nao pode viajar escondido — uma extracao que "esqueca" os
 * achados vira erro de compilacao no consumidor, nao dado perdido em silencio.
 */
export interface ResultadoExtracao {
  leituras: LeituraExtraida[];
  achadosLivres: AchadoLivre[];
}

/**
 * Token de injecao do adapter ativo. A escolha do driver mora na factory
 * (`adapters/extractor.factory.ts`), nunca no consumidor.
 */
export const EXTRACTOR_PORT = 'EXTRACTOR_PORT';

export abstract class ExtractorPort {
  /** 'textract' | 'bedrock' | 'mock' — aparece em log e na tabela do spike. */
  abstract readonly nome: string;

  /**
   * UMA chamada de visao por foto. Sem retry automatico e sem laco interno:
   * constraint 4 do SPEC (visao so sob disparo explicito) mora aqui.
   *
   * Devolve leituras E achados livres da MESMA resposta do servico — nunca uma
   * segunda chamada para "olhar o resto da foto".
   */
  abstract extrair(
    fonte: FonteImagem,
    alvos: CampoAlvo[],
  ): Promise<ResultadoExtracao>;
}
