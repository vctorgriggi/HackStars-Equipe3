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
 *
 * EIXO: QUAL VISTA DA PECA a foto mostra — nao "qual marcacao" (mudanca de
 * 2026-07-25). Tres razoes:
 *
 * 1. e o que a camera fixa enxerga em producao: uma camera ve A LATERAL
 *    DIREITA, nunca "o chumbado 2". A porta ja nasce falando a lingua do
 *    hardware que vai substituir o celular (SPEC, "Cameras fixas na linha");
 * 2. e como o desenho tecnico se organiza (vistas ortograficas), entao a
 *    checklist do ProjetoModelo passa a ser transcrivel face a face;
 * 3. elimina a numeracao arbitraria (`chumbado-1/2/3`), que obrigava o
 *    operador a DECIDIR qual posicao era a "1" — decisao sem gabarito,
 *    inconsistente entre operadores e sem correspondencia no desenho.
 *
 * ZOOM E UM EIXO SEPARADO DE ORIENTACAO: `placa` e `etiqueta` ficam SOBRE uma
 * face, mas o texto e pequeno demais para uma foto de vista inteira — sao
 * closes, com captura propria. Por isso continuam no vocabulario ao lado das
 * orientacoes, sem contradize-las.
 *
 * O QUE SAIU: `serigrafia` e `chumbado-N` nao sao vistas — sao PROCESSOS de
 * marcacao (tinta e relevo) que aparecem EM vistas. Eles seguem vivos nos
 * NOMES DE CAMPO da checklist (`serie-chumbada-topo`,
 * `patrimonio-serigrafia-frente`), que e onde a informacao "como foi gravado"
 * pertence.
 *
 * CONSEQUENCIA DESEJADA: uma vista pode declarar MAIS DE UM alvo (o topo tem
 * serie chumbada E patrimonio serigrafado). Onde antes a foto de `chumbado-1`
 * escondia a ambiguidade — o extrator casava o unico numero visivel com o
 * unico campo pedido —, agora ela fica explicita e vira `nao_conferivel`.
 */
export type FonteFisica =
  | 'base'
  | 'topo'
  | 'frente'
  | 'traseira'
  | 'lateral-esquerda'
  | 'lateral-direita'
  | 'placa'
  | 'etiqueta'
  | 'geral';

export const FONTES_FISICAS: FonteFisica[] = [
  'base',
  'topo',
  'frente',
  'traseira',
  'lateral-esquerda',
  'lateral-direita',
  'placa',
  'etiqueta',
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
 * Se a leitura foi CORROBORADA por releitura independente da mesma regiao.
 *
 * So faz sentido para marcacao em RELEVO (`ports/marcacao.ts`), onde a
 * confianca do servico mede enquadramento e nao correcao. Ausente = "nao se
 * aplica": e o estado de toda leitura de tinta/impresso, e e o que mantem o
 * cenario-ancora intacto (a placa impressa segue podendo ser `divergente` com
 * uma leitura so).
 *
 * - `confirmada`: as releituras por recorte devolveram o MESMO valor.
 * - `nao-confirmada`: nao deu para corroborar (sem bounding box, sem lib de
 *   imagem, orcamento de chamadas gasto) OU os recortes se contradisseram — no
 *   segundo caso o `valorLido` tambem vai nulo, porque leitura contraditoria
 *   nao pode nem sustentar um `conforme`.
 */
export type Corroboracao = 'confirmada' | 'nao-confirmada';

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
  /** Ausente = marcacao que nao exige corroboracao (tinta, impresso). */
  corroboracao?: Corroboracao;
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
   * TETO FIXO de chamadas de visao por foto. Sem retry automatico e sem laco:
   * constraint 4 do SPEC (visao so sob disparo explicito) mora aqui.
   *
   * O teto e 3 e nao 1 desde a corroboracao por recorte (`adapters/recorte.ts`):
   * 1 leitura da foto inteira + 2 releituras de recorte da MESMA regiao, so
   * para marcacao em relevo. E numero fixo, nao laco: nao existe "tentar de
   * novo ate convencer". Custo medido: USD 0,0225 por conferencia — ~22 mil
   * conferencias dentro dos creditos.
   *
   * O que continua proibido: uma segunda chamada para "olhar o resto da foto".
   * Leituras e achados livres saem da MESMA resposta da primeira chamada.
   */
  abstract extrair(
    fonte: FonteImagem,
    alvos: CampoAlvo[],
  ): Promise<ResultadoExtracao>;
}
