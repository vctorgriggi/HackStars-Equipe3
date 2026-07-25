import { Logger } from '@nestjs/common';
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';

import {
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  LeituraExtraida,
} from '../ports/extractor.port';

/**
 * Adapter Bedrock (Claude, visao) — para os casos que o OCR classico nao pega:
 * serie chumbada em baixo relevo, serigrafia desgastada, foto torta.
 *
 * ESTRATEGIA:
 * - uma unica chamada `messages.create` por foto (bloco de imagem base64 +
 *   instrucao em portugues), listando so os campos alvo daquela fonte fisica;
 * - a resposta e JSON puro; a confianca e AUTO-REPORTADA pelo modelo, ou seja,
 *   e uma estimativa dele, nao uma medida do servico. O spike T2.1 e quem vai
 *   dizer o quanto ela e calibravel — ate la trate como sinal, nao como
 *   garantia (e a engine continua com o limiar por parametro);
 * - parse defensivo: bloco ```json opcional, chaves faltando, tipo errado.
 *   Resposta ilegivel vira leitura com `valorLido: null` — o adapter nunca
 *   deixa "quase JSON" virar valor.
 *
 * `regiaoLeitura` sai sempre `null`: o Bedrock nao devolve bounding box.
 * Bounding box so existe no caminho Textract (`textract.extractor.ts`).
 */

/**
 * Model id no Bedrock leva prefixo `anthropic.` (ver docs/aws.md).
 * Sobrescrevível por BEDROCK_MODEL_ID: a conta pode exigir o id de inference
 * profile (prefixo `us.`, ex.: us.anthropic.claude-opus-5) — o spike T2.1
 * testa os dois formatos sem mudar código. Chave de bancada, como
 * EXTRACTOR_DRIVER.
 */
export const MODELO_BEDROCK =
  process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-opus-5';

/** Teto de saida. A resposta e um JSON curto; nao ha por que dar mais folga. */
export const MAX_TOKENS_BEDROCK = 1024;

export const REGIAO_PADRAO = 'us-east-1';

/** Tipos de imagem aceitos pelo bloco `image` da API de mensagens. */
const MIMES_SUPORTADOS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

type MimeSuportado = (typeof MIMES_SUPORTADOS)[number];

/** Dica por prefixo de campo — ajuda o modelo a saber o que procurar. */
const DICAS_POR_PREFIXO: { prefixo: string; dica: string }[] = [
  {
    prefixo: 'serie-',
    dica: 'numero de serie da peca (sequencia de digitos, normalmente 6 ou mais)',
  },
  {
    prefixo: 'patrimonio-',
    dica: 'numero de patrimonio (sequencia de digitos, normalmente 6 ou mais)',
  },
  { prefixo: 'cliente-', dica: 'nome e/ou codigo do cliente' },
  { prefixo: 'potencia-', dica: 'potencia nominal, com unidade (ex.: 10 kVA)' },
];

interface ItemResposta {
  campo: string;
  valorLido: string | null;
  confianca: number | null;
  observacao: string | null;
}

export function ehMimeSuportado(mimeType: string): mimeType is MimeSuportado {
  return (MIMES_SUPORTADOS as readonly string[]).includes(mimeType);
}

export function resolverRegiao(env: NodeJS.ProcessEnv = process.env): string {
  // Mesma regiao do S3 do projeto por padrao — bucket e Bedrock na mesma conta.
  const bruto = env.AWS_S3_REGION ?? env.AWS_REGION ?? '';

  return bruto.trim().length > 0 ? bruto.trim() : REGIAO_PADRAO;
}

function dicaDoCampo(campo: string): string {
  return (
    DICAS_POR_PREFIXO.find((item) => campo.startsWith(item.prefixo))?.dica ??
    'valor impresso/gravado correspondente a este campo'
  );
}

export function montarPrompt(fonteFisica: string, alvos: CampoAlvo[]): string {
  const listaCampos = alvos
    .map((alvo) => `- "${alvo.campo}": ${dicaDoCampo(alvo.campo)}`)
    .join('\n');

  return [
    'Voce esta conferindo um transformador industrial em uma fabrica.',
    `A foto anexada mostra a fonte fisica "${fonteFisica}" da peca.`,
    '',
    'Extraia APENAS os campos alvo abaixo, lendo somente o que esta visivel na',
    'imagem. Nao complete, nao corrija e nao deduza valor a partir de',
    'conhecimento externo. Campo ilegivel, cortado ou ausente sai com',
    '"valorLido": null — devolver null e o resultado CORRETO nesse caso.',
    '',
    'Campos alvo:',
    listaCampos,
    '',
    'Responda APENAS com JSON, sem texto antes ou depois, no formato:',
    '[{"campo": "...", "valorLido": "..."|null, "confianca": 0.0, "observacao": "..."}]',
    '',
    'Regras da resposta:',
    '- um item por campo alvo, na mesma ordem da lista;',
    '- "valorLido": transcricao exata do que esta na imagem, ou null;',
    '- "confianca": numero de 0 a 1 com sua confianca real na leitura. Use',
    '  0.9 ou mais so quando o valor estiver nitido e sem ambiguidade; use',
    '  valor baixo quando estiver adivinhando;',
    '- "observacao": frase curta sobre a condicao da leitura (ex.: "relevo com',
    '  baixo contraste"), ou null.',
    '',
    'Nao inclua tags XML internas ou de sistema na resposta.',
  ].join('\n');
}

/**
 * Parse defensivo do texto devolvido pelo modelo. Aceita JSON puro ou cercado
 * por bloco ```json. Qualquer coisa fora do formato devolve `null` — quem
 * chama transforma isso em leituras vazias.
 */
export function parseRespostaJson(texto: string): ItemResposta[] | null {
  // Cerca de bloco some; o resto e recortado pelo primeiro '[' e ultimo ']',
  // o que tambem descarta preambulo/epilogo em prosa.
  const semCerca = texto.replace(/```(?:json)?/gi, '');

  const inicio = semCerca.indexOf('[');
  const fim = semCerca.lastIndexOf(']');
  if (inicio === -1 || fim === -1 || fim < inicio) {
    return null;
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(semCerca.slice(inicio, fim + 1));
  } catch {
    return null;
  }

  if (!Array.isArray(bruto)) {
    return null;
  }

  const itens: ItemResposta[] = [];
  for (const entrada of bruto) {
    if (typeof entrada !== 'object' || entrada === null) {
      continue;
    }
    const item = entrada as Record<string, unknown>;
    if (typeof item.campo !== 'string' || item.campo.length === 0) {
      continue;
    }

    itens.push({
      campo: item.campo,
      valorLido:
        typeof item.valorLido === 'string'
          ? item.valorLido
          : typeof item.valorLido === 'number' &&
              Number.isFinite(item.valorLido)
            ? String(item.valorLido)
            : null,
      confianca: normalizarConfianca(item.confianca),
      observacao: typeof item.observacao === 'string' ? item.observacao : null,
    });
  }

  return itens;
}

/** Confianca fora de 0..1 ou de tipo errado nao vira lastro: vira null. */
function normalizarConfianca(bruto: unknown): number | null {
  if (typeof bruto !== 'number' || !Number.isFinite(bruto)) {
    return null;
  }
  if (bruto < 0 || bruto > 1) {
    return null;
  }
  return bruto;
}

export class BedrockExtractor extends ExtractorPort {
  readonly nome = 'bedrock';

  private readonly logger = new Logger(BedrockExtractor.name);

  private readonly cliente: AnthropicBedrockMantle;

  constructor(
    regiao: string = resolverRegiao(),
    private readonly modelo: string = MODELO_BEDROCK,
  ) {
    super();
    this.cliente = new AnthropicBedrockMantle({ awsRegion: regiao });
  }

  async extrair(
    fonte: FonteImagem,
    alvos: CampoAlvo[],
  ): Promise<LeituraExtraida[]> {
    if (alvos.length === 0) {
      return [];
    }

    const mediaType = fonte.mimeType;
    if (!ehMimeSuportado(mediaType)) {
      // Falha alta e barata: mime errado e defeito de quem montou a foto, nao
      // limitacao de leitura. Devolver leitura nula aqui esconderia o bug
      // atras de um "nao consegui ler".
      throw new Error(
        `mime-nao-suportado: ${fonte.mimeType} (aceitos: ${MIMES_SUPORTADOS.join(', ')})`,
      );
    }

    // UMA chamada por foto, sem retry proprio e sem laco (constraint 4 do SPEC).
    const resposta = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: MAX_TOKENS_BEDROCK,
      // Extracao curta e estruturada: raciocinio estendido so consumiria o
      // orcamento de `max_tokens` (que cobre thinking + resposta) e arriscaria
      // truncar o JSON no meio.
      thinking: { type: 'disabled' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: fonte.imagem.toString('base64'),
              },
            },
            { type: 'text', text: montarPrompt(fonte.fonteFisica, alvos) },
          ],
        },
      ],
    });

    if (resposta.stop_reason === 'refusal') {
      this.logger.warn(
        `resposta recusada pelo modelo em ${fonte.fonteFisica}; leituras nulas`,
      );
      return this.leiturasVazias(alvos, fonte);
    }

    const texto = resposta.content
      .map((bloco) => (bloco.type === 'text' ? bloco.text : ''))
      .join('\n');

    const itens = parseRespostaJson(texto);
    if (itens === null) {
      this.logger.warn(
        `resposta ilegivel (nao e JSON no formato esperado) em ` +
          `${fonte.fonteFisica}; leituras nulas. stop_reason=` +
          `${resposta.stop_reason ?? 'desconhecido'}`,
      );
      return this.leiturasVazias(alvos, fonte);
    }

    // Alvo manda: item devolvido para campo fora da lista e descartado, campo
    // sem item vira leitura nula.
    return alvos.map((alvo) => {
      const item = itens.find((atual) => atual.campo === alvo.campo);
      const valorLido =
        item?.valorLido !== undefined && item.valorLido !== null
          ? item.valorLido.trim()
          : null;

      return {
        campo: alvo.campo,
        valorLido:
          valorLido !== null && valorLido.length > 0 ? valorLido : null,
        confianca:
          valorLido !== null && valorLido.length > 0
            ? (item?.confianca ?? null)
            : null,
        // Bedrock nao devolve bounding box — so o Textract tem regiao.
        regiaoLeitura: null,
        fotoEvidenciaId: fonte.fotoEvidenciaId,
      };
    });
  }

  private leiturasVazias(
    alvos: CampoAlvo[],
    fonte: FonteImagem,
  ): LeituraExtraida[] {
    return alvos.map((alvo) => ({
      campo: alvo.campo,
      valorLido: null,
      confianca: null,
      regiaoLeitura: null,
      fotoEvidenciaId: fonte.fotoEvidenciaId,
    }));
  }
}
