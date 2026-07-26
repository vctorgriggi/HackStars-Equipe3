import { Logger } from '@nestjs/common';

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
 * sem reamostrar) e faz a metadata ja reportar as dimensoes finais. Foto de
 * celular chega deitada com muita frequencia; sem isso as coordenadas do
 * bounding box cairiam em outro lugar da peca e o recorte nao corroboraria
 * nada — falharia SEMPRE, e falharia calado.
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
}

/**
 * Chave de bancada, no mesmo espirito de `EXTRACTOR_DRIVER` (lida do
 * `process.env`, sem passar pelo ConfigService): `EXTRACAO_RECORTE=off`
 * desliga a corroboracao por recorte e devolve o adapter ao comportamento de
 * UMA chamada por foto. Existe para a hipotese de a lib nativa se comportar
 * mal em producao no dia da demo — desligar e uma variavel, nao um deploy de
 * codigo.
 */
export function recorteLigado(
  valor: string | undefined = process.env.EXTRACAO_RECORTE,
): boolean {
  return (valor ?? '').trim().toLowerCase() !== 'off';
}

const logger = new Logger('Recorte');

type Sharp = (typeof import('sharp'))['default'];

let sharpCarregado: Sharp | null | undefined;

/**
 * Carrega `sharp` UMA vez, e tolera a ausencia dela.
 *
 * `sharp` e binario nativo (libvips). O build do container foi testado
 * (`docker build -f Dockerfile.production .` no node:24-alpine) e passa, mas
 * binario nativo em imagem musl e um risco real e o hackathon tem 2 dias:
 * import dinamico dentro de try/catch faz a falta da lib virar DEGRADACAO
 * (uma chamada por foto, leitura sem corroboracao) em vez de a API nao subir.
 */
async function carregarSharp(): Promise<Sharp | null> {
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
    // `autoOrient` faz a metadata ja falar das dimensoes DEPOIS da rotacao
    // EXIF — as mesmas coordenadas em que o servico de visao leu a foto.
    const metadata = await sharp(imagem, { autoOrient: true }).metadata();
    largura = metadata.width ?? 0;
    altura = metadata.height ?? 0;
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
  };
}
