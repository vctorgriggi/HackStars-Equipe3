import { Logger } from '@nestjs/common';

import {
  EstatisticasDeRegiao,
  histogramaDe,
  resumirHistograma,
} from './contraste';

/**
 * RECORTE DE REGIAO NA RESOLUCAO NATIVA — a unica manipulacao de imagem do
 * backend, e a mais boba possivel de proposito.
 *
 * O QUE O SPIKE DE 2026-07-25 APROVOU: recortar em volta do bounding box que o
 * Textract ja devolveu e RELER o recorte, sem redimensionar e sem filtro de
 * pixel. Numero medido: uma serie chumbada que saia a 41,0% na foto inteira
 * voltou a 91,4% (margem 15%) e 95,5% (margem 150%), acertou o valor em 3/3
 * fotos de controle e NUNCA mudou um valor que ja estava correto.
 *
 * O QUE O MESMO SPIKE REPROVOU, e por isso nao existe aqui:
 * - AMPLIAR (upscale): 4x quebrou ate foto que lia a 99% — perdeu o digito
 *   inicial e ainda assim reportou 93,7% de confianca;
 * - PRE-PROCESSAMENTO DE PIXEL (grayscale, CLAHE, sharpen): baixou tudo, e o
 *   grayscale puro chegou a transformar um `8` em `9`.
 * Entao: `extract` e nada mais. Qualquer PR que acrescente `resize`,
 * `normalize`, `sharpen` ou `greyscale` aqui esta desfazendo uma medicao.
 *
 * EXIF: `autoOrient` aplica a orientacao gravada na foto (rotacao de 90 graus,
 * sem reamostrar). Foto de celular chega deitada com muita frequencia; sem isso
 * as coordenadas do bounding box cairiam em outro lugar da peca e o recorte nao
 * corroboraria nada — falharia SEMPRE, e falharia calado.
 *
 * ARMADILHA MEDIDA em 2026-07-26, que ja estava CUSTANDO a corroboracao:
 * `sharp(buf, { autoOrient: true }).metadata()` devolve as dimensoes CRUAS do
 * arquivo, nao as de depois da rotacao (sharp 0.35.3). Em `PLACA-4.jpg`
 * (orientation 6) a metadata dizia 4096x2304 enquanto o pipeline recortava uma
 * imagem 2304x4096 — e o `extract` estourava com `bad extract area` ou, pior,
 * caia numa regiao vazia da foto. O Textract, por sua vez, RESPEITA o EXIF:
 * verificado recortando o bounding box de `847833` nos dois referenciais — no
 * cru sai um borrao, no orientado sai o numero legivel. Por isso as dimensoes
 * sao trocadas a mao quando `orientation` e 5..8 (`dimensoesOrientadas`).
 */

/** Bounding box do Textract: coordenadas normalizadas 0..1. */
export interface CaixaNormalizada {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

/** Retangulo em PIXELS da imagem ja orientada. */
export interface RetanguloPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Recorte {
  imagem: Buffer;
  /** Retangulo efetivamente recortado (ja limitado as bordas da foto). */
  retangulo: RetanguloPx;
  /** A caixa original vista DE DENTRO do recorte (0..1 do recorte). */
  caixaNoRecorte: CaixaNormalizada;
}

export interface ImagemRecortavel {
  largura: number;
  altura: number;
  /** `null` quando o recorte nao pode ser produzido (nunca lanca). */
  recortar(caixa: CaixaNormalizada, margem: number): Promise<Recorte | null>;
  /**
   * Luminancia DENTRO da caixa e no ANEL em volta dela — a materia-prima da
   * discriminacao tinta x relevo (`contraste.ts`). `null` quando nao da para
   * medir (nunca lanca); quem chama trata como `indeterminado`.
   *
   * NAO manda nada para OCR e nao altera pixel nenhum: so conta. O que o spike
   * reprovou foi PRE-PROCESSAR a imagem enviada ao Textract; medir e outra
   * coisa, e e de graca.
   */
  medirRegiao(caixa: CaixaNormalizada): Promise<EstatisticasDeRegiao | null>;
}

/**
 * Chave de bancada, no mesmo espirito de `EXTRACTOR_DRIVER` (lida do
 * `process.env`, sem passar pelo ConfigService): `EXTRACAO_RECORTE=off`
 * desliga a corroboracao por recorte e devolve o adapter ao comportamento de
 * UMA chamada por foto. Existe para a hipotese de a lib nativa se comportar
 * mal em producao no dia da demo — desligar e uma variavel, nao um deploy de
 * codigo.
 *
 * O NOME ficou estreito e o alcance nao: a chave e o disjuntor de TODA leitura
 * de pixel feita pela lib nativa — recorte, medicao de contraste e, desde
 * 2026-07-26, a decodificacao do QR da placa (`qr-imagem.ts`). Se sharp e o
 * problema, nao adianta desligar dois dos tres usos dela. Efeito de desligar:
 * relevo sai `nao-confirmada` e os campos `*-qr` saem sem leitura
 * (`nao_conferivel`) — degradacao, nunca valor chutado.
 */
export function recorteLigado(
  valor: string | undefined = process.env.EXTRACAO_RECORTE,
): boolean {
  return (valor ?? '').trim().toLowerCase() !== 'off';
}

const logger = new Logger('Recorte');

export type Sharp = (typeof import('sharp'))['default'];

let sharpCarregado: Sharp | null | undefined;

/**
 * Carrega `sharp` UMA vez, e tolera a ausencia dela.
 *
 * `sharp` e binario nativo (libvips). O build do container foi testado
 * (`docker build -f Dockerfile.production .` no node:24-alpine) e passa, mas
 * binario nativo em imagem musl e um risco real e o hackathon tem 2 dias:
 * import dinamico dentro de try/catch faz a falta da lib virar DEGRADACAO
 * (uma chamada por foto, leitura sem corroboracao) em vez de a API nao subir.
 *
 * EXPORTADA para `qr-imagem.ts` (decodificacao do QR da placa) usar o MESMO
 * loader: um cache, um aviso e um unico ponto onde a lib nativa pode faltar.
 * Duas tentativas de import independentes acabariam com metade do sistema
 * degradando e a outra metade nao.
 */
export async function carregarSharp(): Promise<Sharp | null> {
  if (sharpCarregado !== undefined) {
    return sharpCarregado;
  }

  try {
    sharpCarregado = (await import('sharp')).default;
  } catch (erro) {
    sharpCarregado = null;
    logger.warn(
      `recorte indisponivel: sharp nao carregou ` +
        `(${erro instanceof Error ? erro.message : String(erro)}); ` +
        `a extracao segue com UMA leitura por foto, sem corroboracao`,
    );
  }

  return sharpCarregado;
}

/** Reinicia o cache do loader — so para teste do caminho de degradacao. */
export function esquecerSharp(): void {
  sharpCarregado = undefined;
}

/** `regiaoLeitura` (JSON do bounding box) -> caixa, ou null se nao servir. */
export function lerCaixa(regiao: string | null): CaixaNormalizada | null {
  if (regiao === null || regiao.trim().length === 0) {
    return null;
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(regiao);
  } catch {
    return null;
  }

  const caixa = bruto as Partial<CaixaNormalizada> | null;
  if (
    typeof caixa !== 'object' ||
    caixa === null ||
    typeof caixa.Left !== 'number' ||
    typeof caixa.Top !== 'number' ||
    typeof caixa.Width !== 'number' ||
    typeof caixa.Height !== 'number' ||
    caixa.Width <= 0 ||
    caixa.Height <= 0
  ) {
    return null;
  }

  return {
    Left: caixa.Left,
    Top: caixa.Top,
    Width: caixa.Width,
    Height: caixa.Height,
  };
}

/**
 * Caixa normalizada + tamanho da foto + margem -> retangulo em pixels.
 * Funcao PURA (e por isso testavel sem lib nativa nenhuma).
 *
 * `margem` e fracao do LADO DA CAIXA acrescentada de CADA lado: 0.5 devolve
 * um retangulo com o dobro da largura/altura da caixa, 1.5 com o quadruplo.
 * Sai limitado as bordas da foto — recorte que vazaria a imagem e cortado, nao
 * deslocado (deslocar mudaria a regiao que se quer corroborar).
 */
export function calcularRecorte(
  caixa: CaixaNormalizada,
  largura: number,
  altura: number,
  margem: number,
): RetanguloPx | null {
  if (largura <= 0 || altura <= 0) {
    return null;
  }

  const caixaEmPx = {
    left: caixa.Left * largura,
    top: caixa.Top * altura,
    width: caixa.Width * largura,
    height: caixa.Height * altura,
  };

  if (caixaEmPx.width <= 0 || caixaEmPx.height <= 0) {
    return null;
  }

  const esquerda = Math.max(
    0,
    Math.floor(caixaEmPx.left - caixaEmPx.width * margem),
  );
  const topo = Math.max(
    0,
    Math.floor(caixaEmPx.top - caixaEmPx.height * margem),
  );
  const direita = Math.min(
    largura,
    Math.ceil(caixaEmPx.left + caixaEmPx.width * (1 + margem)),
  );
  const base = Math.min(
    altura,
    Math.ceil(caixaEmPx.top + caixaEmPx.height * (1 + margem)),
  );

  const width = direita - esquerda;
  const height = base - topo;
  if (width < 1 || height < 1) {
    return null;
  }

  return { left: esquerda, top: topo, width, height };
}

/**
 * A caixa original vista de dentro do recorte. Funcao PURA.
 *
 * E o que permite ANCORAR a releitura: o recorte pode conter outras marcacoes
 * (o topo da peca tem serie chumbada E patrimonio serigrafado), e comparar
 * "algum numero do recorte" com o valor lido aceitaria a marcacao vizinha como
 * corroboracao. Ancorar na posicao mantem a pergunta certa: "o que esta AQUI
 * continua sendo o mesmo numero?".
 */
export function mapearCaixaNoRecorte(
  caixa: CaixaNormalizada,
  retangulo: RetanguloPx,
  largura: number,
  altura: number,
): CaixaNormalizada {
  return {
    Left: (caixa.Left * largura - retangulo.left) / retangulo.width,
    Top: (caixa.Top * altura - retangulo.top) / retangulo.height,
    Width: (caixa.Width * largura) / retangulo.width,
    Height: (caixa.Height * altura) / retangulo.height,
  };
}

/**
 * Largura do ANEL de referencia, em ALTURAS do proprio bounding box, aplicada
 * nos quatro lados. Funcao PURA.
 *
 * A escala e a ALTURA e nao a largura porque a altura de uma linha de texto e o
 * tamanho do caractere: uma linha larga e baixa ('10 kVA 251328', 1361x327 px)
 * com margem proporcional a LARGURA traria meia peca para dentro do anel, e o
 * anel deixaria de descrever o fundo IMEDIATO da marcacao — que e a unica coisa
 * que torna a medida invariante a iluminacao.
 *
 * O valor 1,0 e o que foi calibrado com as fotos reais (tabela em
 * `contraste.ts`); mudar aqui invalida os limiares de la.
 */
const ANEL_EM_ALTURAS = 1;

/**
 * Retangulo expandido igualmente nos quatro lados, limitado a foto. Funcao PURA.
 */
export function calcularEnvelope(
  dentro: RetanguloPx,
  folgaEmPx: number,
  largura: number,
  altura: number,
): RetanguloPx {
  const esquerda = Math.max(0, Math.floor(dentro.left - folgaEmPx));
  const topo = Math.max(0, Math.floor(dentro.top - folgaEmPx));
  const direita = Math.min(
    largura,
    Math.ceil(dentro.left + dentro.width + folgaEmPx),
  );
  const base = Math.min(
    altura,
    Math.ceil(dentro.top + dentro.height + folgaEmPx),
  );

  return {
    left: esquerda,
    top: topo,
    width: direita - esquerda,
    height: base - topo,
  };
}

/**
 * Dimensoes da imagem DEPOIS da rotacao EXIF, a partir do que a metadata crua
 * informa. Funcao PURA — e a correcao da armadilha descrita no topo do arquivo.
 *
 * Tags 5..8 do EXIF envolvem transposicao (rotacao de 90 ou 270 graus): a foto
 * decodificada troca largura por altura. 1..4 (e ausente/invalida) nao trocam.
 */
export function dimensoesOrientadas(
  largura: number,
  altura: number,
  orientacao: number | undefined,
): { largura: number; altura: number } {
  return orientacao !== undefined && orientacao >= 5 && orientacao <= 8
    ? { largura: altura, altura: largura }
    : { largura, altura };
}

/** Area da intersecao entre duas caixas normalizadas (0 = nao se tocam). */
export function areaDaIntersecao(
  a: CaixaNormalizada,
  b: CaixaNormalizada,
): number {
  const largura =
    Math.min(a.Left + a.Width, b.Left + b.Width) - Math.max(a.Left, b.Left);
  const altura =
    Math.min(a.Top + a.Height, b.Top + b.Height) - Math.max(a.Top, b.Top);

  return largura <= 0 || altura <= 0 ? 0 : largura * altura;
}

/**
 * Abre a foto para recorte. Devolve `null` — sem lancar — quando a lib nativa
 * falta, esta desligada por env ou a imagem nao decodifica: o chamador degrada
 * para "leitura nao corroborada", que e o comportamento seguro.
 */
export async function abrirImagem(
  imagem: Buffer,
): Promise<ImagemRecortavel | null> {
  if (!recorteLigado()) {
    return null;
  }

  const sharp = await carregarSharp();
  if (sharp === null) {
    return null;
  }

  let largura: number;
  let altura: number;

  try {
    // A metadata fala das dimensoes CRUAS (ver "ARMADILHA MEDIDA" no topo);
    // `dimensoesOrientadas` as traz para o referencial em que o servico de
    // visao leu a foto, que e o unico em que o bounding box faz sentido.
    const metadata = await sharp(imagem, { autoOrient: true }).metadata();
    const orientadas = dimensoesOrientadas(
      metadata.width ?? 0,
      metadata.height ?? 0,
      metadata.orientation,
    );
    largura = orientadas.largura;
    altura = orientadas.altura;
  } catch (erro) {
    logger.warn(
      `imagem nao decodificou para recorte ` +
        `(${erro instanceof Error ? erro.message : String(erro)})`,
    );
    return null;
  }

  if (largura <= 0 || altura <= 0) {
    return null;
  }

  return {
    largura,
    altura,
    async recortar(
      caixa: CaixaNormalizada,
      margem: number,
    ): Promise<Recorte | null> {
      const retangulo = calcularRecorte(caixa, largura, altura, margem);
      if (retangulo === null) {
        return null;
      }

      try {
        const recortada = await sharp(imagem, { autoOrient: true })
          // PNG: reencodar em JPEG acrescentaria artefato de compressao a uma
          // leitura que ja e dificil. Sem `resize`, sem filtro — so o corte.
          .extract(retangulo)
          .png()
          .toBuffer();

        return {
          imagem: recortada,
          retangulo,
          caixaNoRecorte: mapearCaixaNoRecorte(
            caixa,
            retangulo,
            largura,
            altura,
          ),
        };
      } catch (erro) {
        logger.warn(
          `recorte falhou (margem ${margem}): ` +
            `${erro instanceof Error ? erro.message : String(erro)}`,
        );
        return null;
      }
    },

    async medirRegiao(
      caixa: CaixaNormalizada,
    ): Promise<EstatisticasDeRegiao | null> {
      const dentro = calcularRecorte(caixa, largura, altura, 0);
      if (dentro === null) {
        return null;
      }

      const fora = calcularEnvelope(
        dentro,
        dentro.height * ANEL_EM_ALTURAS,
        largura,
        altura,
      );

      try {
        // Duas leituras de pixel do MESMO buffer. O anel sai por SUBTRACAO de
        // histogramas (fora menos dentro) — o retangulo interno esta contido no
        // externo, entao a conta e exata e nao materializa milhoes de pixels.
        const [pixelsDentro, pixelsFora] = await Promise.all([
          cinzaDe(sharp, imagem, dentro),
          cinzaDe(sharp, imagem, fora),
        ]);

        const baldesDentro = histogramaDe(pixelsDentro);
        const baldesFora = histogramaDe(pixelsFora);
        const baldesAnel = new Uint32Array(256);
        for (let valor = 0; valor < 256; valor++) {
          baldesAnel[valor] = Math.max(
            0,
            baldesFora[valor] - baldesDentro[valor],
          );
        }

        return {
          dentro: resumirHistograma(baldesDentro),
          anel: resumirHistograma(baldesAnel),
        };
      } catch (erro) {
        logger.warn(
          `medicao de contraste falhou: ` +
            `${erro instanceof Error ? erro.message : String(erro)}`,
        );
        return null;
      }
    },
  };
}

/** Pixels em tom de cinza de um retangulo, na resolucao nativa. */
function cinzaDe(
  sharp: Sharp,
  imagem: Buffer,
  retangulo: RetanguloPx,
): Promise<Buffer> {
  return sharp(imagem, { autoOrient: true })
    .extract(retangulo)
    .greyscale()
    .raw()
    .toBuffer();
}
