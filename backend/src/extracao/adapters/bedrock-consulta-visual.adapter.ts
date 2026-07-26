import { Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

import { ConsultaVisualPort } from '../ports/consulta-visual.port';
import { ehMimeSuportado, resolverRegiao } from './bedrock.extractor';

/**
 * Adapter de CONSULTA VISUAL generica (Claude no Bedrock, API Converse).
 *
 * Nao confundir com `bedrock.extractor.ts`: aquele foi REPROVADO por medicao
 * para LER numero (alucina numero plausivel onde o Textract admite nao ter
 * lido — docs/visao-ocr.md). Aqui a resposta e TEXTO LIVRE de inspecao, sem
 * confianca e sem evidencia — por contrato da porta, ela jamais vira leitura
 * de campo nem entra na engine de conformidade.
 *
 * Converse (e nao InvokeModel/Mantle) pelo mesmo motivo do
 * `bedrock-redator.adapter.ts`: o catalogo habilitado NESTA conta e de
 * inference profiles classicos (prefixo `us.`), caminho verificado em
 * 2026-07-26. Trocar de modelo e mexer em `CONSULTA_VISUAL_MODEL_ID`, nao em
 * codigo.
 */

/**
 * Modelo da consulta. Haiku 4.5 porque leu bem a foto dificil no recorte
 * (docs/visao-ocr.md, adendo 2026-07-26) e e o mais barato da familia — bom
 * para um utilitario de bancada. Chave de bancada, como `LAUDO_MODEL_ID`.
 */
export const MODELO_CONSULTA_PADRAO =
  'us.anthropic.claude-haiku-4-5-20251001-v1:0';

/** Teto de saida do snippet original; limita o custo por chamada a centavos. */
export const MAX_TOKENS_CONSULTA = 1024;

export function resolverModeloDaConsulta(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const bruto = (env.CONSULTA_VISUAL_MODEL_ID ?? '').trim();
  return bruto.length > 0 ? bruto : MODELO_CONSULTA_PADRAO;
}

export type FormatoDeImagem = 'jpeg' | 'png' | 'gif' | 'webp';

const FORMATO_POR_MIME: Record<string, FormatoDeImagem> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Mime -> `format` que o bloco `image` do Converse exige. Pura e exportada
 * para ser testavel sem AWS; mime fora da tabela estoura ANTES de gastar
 * chamada.
 */
export function formatoDaImagem(mimeType: string): FormatoDeImagem {
  const formato = FORMATO_POR_MIME[mimeType];

  if (!formato) {
    throw new Error(
      `mime-nao-suportado: ${mimeType} (aceitos: ${Object.keys(FORMATO_POR_MIME).join(', ')})`,
    );
  }

  return formato;
}

export class BedrockConsultaVisual extends ConsultaVisualPort {
  readonly nome = 'bedrock';

  private readonly logger = new Logger(BedrockConsultaVisual.name);

  private readonly cliente: BedrockRuntimeClient;

  constructor(
    regiao: string = resolverRegiao(),
    readonly modelo: string = resolverModeloDaConsulta(),
  ) {
    super();
    this.cliente = new BedrockRuntimeClient({ region: regiao });
  }

  async consultar(
    imagem: Buffer,
    mimeType: string,
    texto: string,
  ): Promise<string> {
    if (!ehMimeSuportado(mimeType)) {
      // Barrar antes da chamada: mime invalido e erro do chamador, nao
      // limitacao do modelo — e credito AWS nao sai de graca.
      throw new Error(`mime-nao-suportado: ${mimeType}`);
    }

    // UMA chamada por invocacao, sem retry proprio e sem laco (constraint 4
    // do SPEC): credito AWS so sai sob acao explicita do operador.
    const resposta = await this.cliente.send(
      new ConverseCommand({
        modelId: this.modelo,
        messages: [
          {
            role: 'user',
            content: [
              {
                image: {
                  format: formatoDaImagem(mimeType),
                  source: { bytes: imagem },
                },
              },
              { text: texto },
            ],
          },
        ],
        inferenceConfig: { maxTokens: MAX_TOKENS_CONSULTA },
      }),
    );

    const textoDaResposta = (resposta.output?.message?.content ?? [])
      .map((bloco) => bloco.text ?? '')
      .join('\n')
      .trim();

    if (textoDaResposta.length === 0) {
      // Resposta vazia NUNCA vira sucesso silencioso: string em branco na
      // tela seria lida como "o modelo nao viu nada".
      throw new Error(
        `resposta vazia do modelo (stopReason=${resposta.stopReason ?? 'desconhecido'})`,
      );
    }

    if (resposta.stopReason === 'max_tokens') {
      // Nao e erro: o texto util ja esta escrito e o corte cai no fim. Fica o
      // registro para quem estiver calibrando MAX_TOKENS_CONSULTA.
      this.logger.warn(
        'consulta truncada por max_tokens; texto parcial devolvido',
      );
    }

    return textoDaResposta;
  }
}
