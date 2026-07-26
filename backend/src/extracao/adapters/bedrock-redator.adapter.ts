import { Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

import {
  DISCLAIMER_LAUDO,
  FatosDoLaudo,
  RedatorPort,
} from '../ports/redator.port';
import { resolverRegiao } from './bedrock.extractor';

/**
 * Adapter de REDACAO do laudo (Claude no Bedrock, API Converse).
 *
 * Nao confundir com `bedrock.extractor.ts`: aquele foi REPROVADO por medicao
 * para LER numero (alucina numero plausivel onde o Textract admite nao ter
 * lido — docs/visao-ocr.md). Aqui o modelo nao le nada e nao decide nada: ele
 * recebe fatos ja decididos pela engine e escreve prosa sobre eles. E a unica
 * classe de tarefa onde LLM cabe neste projeto — a alucinacao que resta e de
 * ESTILO, e o que a impede de virar fato e a entrada ser um pacote fechado
 * (`FatosDoLaudo`) em vez do payload cru da conferencia.
 *
 * Por que Converse e nao o cliente Mantle do `@anthropic-ai/bedrock-sdk` (que o
 * extractor usa): sao endpoints e catalogos de modelo diferentes, e o modelo
 * habilitado NESTA conta e um inference profile classico
 * (`us.anthropic.claude-sonnet-4-5-...`), verificado em 2026-07-26. Trocar de
 * modelo e mexer em `LAUDO_MODEL_ID`, nao em codigo.
 */

/**
 * Modelo do laudo. Inference profile (prefixo `us.`) porque e o que a conta
 * tem habilitado — id sem o prefixo responde `ValidationException` aqui.
 * Chave de bancada, como `EXTRACTOR_DRIVER`: sobrescrever com `LAUDO_MODEL_ID`.
 */
export const MODELO_LAUDO_PADRAO =
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

/**
 * Teto de saida. O laudo tem 3 paragrafos por contrato de prompt; 600 tokens
 * cobrem isso com folga e limitam o custo por clique a centavos.
 */
export const MAX_TOKENS_LAUDO = 600;

/**
 * Temperatura BAIXA de proposito: laudo e documento, nao redacao criativa.
 * Zero cravado deixaria o texto robotico e repetitivo entre pecas; 0.2 mantem
 * a prosa legivel sem abrir espaco para floreio inventado.
 */
export const TEMPERATURA_LAUDO = 0.2;

export function resolverModeloDoLaudo(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const bruto = (env.LAUDO_MODEL_ID ?? '').trim();
  return bruto.length > 0 ? bruto : MODELO_LAUDO_PADRAO;
}

/**
 * A REGRA DE FERRO do laudo, em texto. Ela repete no prompt o que a arquitetura
 * ja garante (o modelo nao tem acesso a nada alem dos fatos) porque as duas
 * defesas falham de formas diferentes: a arquitetura impede o modelo de SABER
 * outra coisa, o prompt o impede de SUPOR.
 */
export const INSTRUCAO_DO_REDATOR = [
  'Você redige laudos de conferência de transformadores para o chão de fábrica',
  'da TRAEL, uma fábrica de transformadores.',
  '',
  'REGRA DE FERRO: redija APENAS a partir dos fatos fornecidos. Não invente',
  'causa, número, data, nome, percentual, prazo nem recomendação que não esteja',
  'nos fatos. Você NÃO decide, NÃO reclassifica, NÃO suaviza e NÃO completa',
  'veredito nenhum: o veredito já foi emitido pela engine de conformidade do',
  'sistema e é ele que vale. Se algum fato parecer faltar, diga que o dado não',
  'consta — nunca preencha a lacuna.',
  '',
  'Como escrever:',
  '- português do Brasil, linguagem de chão de fábrica: frases curtas, diretas,',
  '  sem jargão de software e sem palavras em inglês;',
  '- no máximo 3 parágrafos, texto corrido, sem título, sem lista, sem tabela e',
  '  sem marcação de formatação;',
  '- comece pelo veredito geral e pelo que ele significa para a peça: peça',
  '  divergente PARA a produção até a correção;',
  '- cite os números exatamente como aparecem nos fatos, dizendo qual é o',
  '  esperado (da etiqueta) e qual foi o lido (na peça);',
  '- campo "nao_conferivel" quer dizer que o sistema NÃO pôde afirmar nada',
  '  sobre ele: escreva que ele exige conferência humana olhando a foto, e não',
  '  o trate nem como aprovado nem como reprovado;',
  '- quando houver etapa avaliada, deixe claro que o laudo cobre só o que',
  '  aquele gate confere, e não a peça inteira;',
  '- não sugira nenhuma ação além do que os fatos sustentam.',
  '',
  'Termine o texto EXATAMENTE com esta frase, sozinha na última linha:',
  DISCLAIMER_LAUDO,
].join('\n');

/** Confianca 0..1 vira porcentagem legivel; sem lastro vira texto explicito. */
function confiancaLegivel(confianca: number | null): string {
  if (confianca === null || !Number.isFinite(confianca)) {
    return 'sem confiança registrada';
  }
  return `confiança ${(confianca * 100).toFixed(1)}%`;
}

/**
 * Fatos -> bloco de texto para o modelo. Puro e exportado para ser testavel: e
 * o unico ponto por onde informacao entra no prompt, entao e ele que precisa
 * ser verificavel sem AWS.
 */
export function montarPromptDoLaudo(fatos: FatosDoLaudo): string {
  const { peca, contagens } = fatos;

  const linhasDeCampo = fatos.campos.map((campo) => {
    const esperado =
      campo.valorEsperado.length > 0 ? campo.valorEsperado : '(não informado)';
    const lido = campo.valorLido ?? '(não lido)';

    return (
      `- ${campo.campo}: veredito ${campo.veredito ?? '(sem veredito)'}; ` +
      `esperado pela etiqueta ${esperado}; lido na peça ${lido}; ` +
      `${confiancaLegivel(campo.confianca)}`
    );
  });

  return [
    'FATOS DA CONFERÊNCIA (não use nada além disto):',
    '',
    'Peça:',
    `- número de série: ${peca.numeroSerie || '(não informado)'}`,
    `- patrimônio: ${peca.patrimonio || '(não informado)'}`,
    `- cliente: ${peca.cliente || '(não informado)'}`,
    '',
    `Conferência executada em: ${fatos.conferidaEm}`,
    `Etapa avaliada: ${fatos.etapaAvaliada ?? 'nenhuma (checklist inteira da peça)'}`,
    `Veredito geral emitido pela engine: ${fatos.vereditoGeral ?? '(sem veredito gravado)'}`,
    `Observação registrada pelo time: ${fatos.observacao ?? '(nenhuma)'}`,
    '',
    'Contagem de campos:',
    `- total conferido: ${contagens.total}`,
    `- conformes: ${contagens.conformes}`,
    `- divergentes: ${contagens.divergentes}`,
    `- não conferíveis: ${contagens.naoConferiveis}`,
    `- sem veredito: ${contagens.semVeredito}`,
    '',
    'Campos, um por linha:',
    ...(linhasDeCampo.length > 0
      ? linhasDeCampo
      : ['- (nenhum campo gravado nesta conferência)']),
    '',
    'Escreva agora o laudo desta conferência.',
  ].join('\n');
}

export class BedrockRedator extends RedatorPort {
  readonly nome = 'bedrock';

  private readonly logger = new Logger(BedrockRedator.name);

  private readonly cliente: BedrockRuntimeClient;

  constructor(
    regiao: string = resolverRegiao(),
    readonly modelo: string = resolverModeloDoLaudo(),
  ) {
    super();
    this.cliente = new BedrockRuntimeClient({ region: regiao });
  }

  async redigirLaudo(fatos: FatosDoLaudo): Promise<string> {
    // UMA chamada por clique, sem retry proprio e sem laco (constraint 4 do
    // SPEC): credito AWS so sai sob acao explicita do operador.
    const resposta = await this.cliente.send(
      new ConverseCommand({
        modelId: this.modelo,
        system: [{ text: INSTRUCAO_DO_REDATOR }],
        messages: [
          { role: 'user', content: [{ text: montarPromptDoLaudo(fatos) }] },
        ],
        inferenceConfig: {
          maxTokens: MAX_TOKENS_LAUDO,
          temperature: TEMPERATURA_LAUDO,
        },
      }),
    );

    const texto = (resposta.output?.message?.content ?? [])
      .map((bloco) => bloco.text ?? '')
      .join('\n')
      .trim();

    if (texto.length === 0) {
      // Resposta vazia NUNCA vira laudo em branco: tela sem texto seria lida
      // como "nada a relatar" sobre uma peca possivelmente divergente.
      throw new Error(
        `resposta vazia do modelo (stopReason=${resposta.stopReason ?? 'desconhecido'})`,
      );
    }

    if (resposta.stopReason === 'max_tokens') {
      // Nao e erro: o texto util ja esta escrito e o corte cai no fim. Fica o
      // registro para quem estiver calibrando MAX_TOKENS_LAUDO.
      this.logger.warn(
        'laudo truncado por max_tokens; texto parcial devolvido ' +
          '(o disclaimer e recolocado pelo service)',
      );
    }

    return texto;
  }
}
