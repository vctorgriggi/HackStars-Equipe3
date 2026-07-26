import { Logger } from '@nestjs/common';
import {
  Block,
  BoundingBox,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';

import {
  AchadoLivre,
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  LeituraExtraida,
  ResultadoExtracao,
} from '../ports/extractor.port';

/**
 * Adapter Textract (OCR classico) — `DetectDocumentTextCommand`.
 *
 * ESTRATEGIA (heuristica validada pelo spike T2.1 com as fotos reais da peca —
 * medicao em docs/visao-ocr.md; `scripts/spike-extracao.ts` reexecuta):
 *
 * 1. o Textract devolve blocos; usamos so os `LINE`, que trazem `Confidence`
 *    (0..100) e `Geometry.BoundingBox` (coordenadas normalizadas 0..1);
 * 2. `confianca` = `Confidence / 100`; `regiaoLeitura` =
 *    `JSON.stringify(boundingBox)`;
 * 3. `serie-*` e `patrimonio-*` -> linhas que sao sequencia de 6+ digitos.
 *    Serie e patrimonio sao ambos numericos e o Textract nao diz qual e qual;
 *    resolvemos por PROXIMIDADE DE ROTULO: se a linha contem (ou tem ao lado)
 *    um rotulo tipo 'N°'/'Serie' ou 'Patrimonio', ela vai para aquela familia.
 *    Sem rotulo, so aceitamos a leitura quando sobra exatamente um candidato
 *    para exatamente um campo pendente. Fora disso o campo sai
 *    `valorLido: null`, `confianca: null`, `regiaoLeitura: null`: melhor nao
 *    chutar do que entregar serie no lugar de patrimonio (a engine trata
 *    ausencia como `nao_conferivel`; um chute errado viraria `divergente` e
 *    mandaria peca boa para retrabalho);
 * 4. `cliente-*` -> linha com mais letras;
 * 5. `potencia-*` -> linha que contem 'kVA'.
 *
 * Prefixo desconhecido sai como leitura nula — o adapter nunca inventa campo
 * fora dos alvos recebidos.
 *
 * ACHADOS LIVRES: toda linha `LINE` que a heuristica acima NAO consumiu como
 * leitura de alvo sai em `achadosLivres` (texto cru, confianca do bloco,
 * bounding box). E a MESMA resposta do Textract — zero chamada AWS a mais
 * (SPEC, Could "conferencia de consistencia por achados livres"). O adapter
 * nao interpreta nem filtra: quem decide o que e ruido e o cruzamento contra
 * os valores do QR, em `conferencias/`.
 */

/** Distancia maxima (coordenadas normalizadas) entre numero e rotulo vizinho. */
const DISTANCIA_MAXIMA_ROTULO = 0.25;

/** Sequencia de digitos considerada candidata a serie/patrimonio. */
const PADRAO_NUMERO = /\d{6,}/g;

/** Linha que e so o numero (tolera espacos, pontos e traços de separacao). */
const PADRAO_LINHA_SO_NUMERO = /^[\s.\-]*\d[\d\s.\-]*$/;

const PADRAO_ROTULO_SERIE =
  /(\bn\s*[º°.]|\bn\b|\bserie\b|\bserial\b|\bnumero\b)/;
const PADRAO_ROTULO_PATRIMONIO =
  /(\bpatrimonio\b|\bpatrim\b|\bpat\b|\bplaqueta\b)/;

type FamiliaNumerica = 'serie' | 'patrimonio';

interface LinhaOcr {
  texto: string;
  textoNormalizado: string;
  confianca: number | null;
  regiao: string | null;
  centro: { x: number; y: number } | null;
}

interface CandidatoNumerico {
  valor: string;
  linha: LinhaOcr;
  familia: FamiliaNumerica | null;
}

/** Remove acentos e baixa a caixa — comparacao de rotulo, nao de valor. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function centroDe(caixa: BoundingBox | undefined): {
  x: number;
  y: number;
} | null {
  if (
    caixa === undefined ||
    caixa.Left === undefined ||
    caixa.Top === undefined ||
    caixa.Width === undefined ||
    caixa.Height === undefined
  ) {
    return null;
  }

  return { x: caixa.Left + caixa.Width / 2, y: caixa.Top + caixa.Height / 2 };
}

function familiaDoTexto(textoNormalizado: string): FamiliaNumerica | null {
  // Patrimonio primeiro: 'patrimonio n° 251328' tem os dois rotulos e o mais
  // especifico deve vencer.
  if (PADRAO_ROTULO_PATRIMONIO.test(textoNormalizado)) {
    return 'patrimonio';
  }
  if (PADRAO_ROTULO_SERIE.test(textoNormalizado)) {
    return 'serie';
  }
  return null;
}

function distancia(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function contarLetras(texto: string): number {
  return (texto.match(/\p{L}/gu) ?? []).length;
}

function familiaDoCampo(campo: string): FamiliaNumerica | null {
  if (campo.startsWith('serie-')) {
    return 'serie';
  }
  if (campo.startsWith('patrimonio-')) {
    return 'patrimonio';
  }
  return null;
}

function leituraVazia(campo: string, fonte: FonteImagem): LeituraExtraida {
  return {
    campo,
    valorLido: null,
    confianca: null,
    regiaoLeitura: null,
    fotoEvidenciaId: fonte.fotoEvidenciaId,
  };
}

function leituraDaLinha(
  campo: string,
  valor: string,
  linha: LinhaOcr,
  fonte: FonteImagem,
): LeituraExtraida {
  return {
    campo,
    valorLido: valor,
    confianca: linha.confianca,
    regiaoLeitura: linha.regiao,
    fotoEvidenciaId: fonte.fotoEvidenciaId,
  };
}

function lerLinhas(blocos: Block[]): LinhaOcr[] {
  return blocos
    .filter((bloco) => bloco.BlockType === 'LINE')
    .map((bloco) => {
      const texto = (bloco.Text ?? '').trim();
      const caixa = bloco.Geometry?.BoundingBox;

      return {
        texto,
        textoNormalizado: normalizar(texto),
        confianca:
          typeof bloco.Confidence === 'number' ? bloco.Confidence / 100 : null,
        regiao: caixa === undefined ? null : JSON.stringify(caixa),
        centro: centroDe(caixa),
      };
    })
    .filter((linha) => linha.texto.length > 0);
}

/**
 * Blocos do Textract -> leituras + achados livres. Funcao PURA (sem I/O, sem
 * SDK em runtime, so o tipo `Block`), no mesmo espirito da engine de
 * conformidade: e a heuristica que decide o que a visao afirma, e todo
 * refinamento dela precisa ser exercitavel sem AWS.
 */
export function interpretarBlocos(
  blocos: Block[],
  alvos: CampoAlvo[],
  fonte: FonteImagem,
): ResultadoExtracao {
  const linhas = lerLinhas(blocos);
  const porCampo = new Map<string, LeituraExtraida>();
  // Linhas que viraram leitura de campo alvo. O que sobra e achado livre —
  // por identidade de objeto, entao a MESMA linha usada em dois campos conta
  // como consumida uma vez so.
  const consumidas = new Set<LinhaOcr>();

  for (const alvo of alvos) {
    porCampo.set(alvo.campo, leituraVazia(alvo.campo, fonte));
  }

  resolverNumericos(linhas, alvos, fonte, porCampo, consumidas);
  resolverTextuais(linhas, alvos, fonte, porCampo, consumidas);

  return {
    // Ordem dos alvos preservada: quem chamou monta a tabela do spike com ela.
    leituras: alvos.map(
      (alvo) => porCampo.get(alvo.campo) ?? leituraVazia(alvo.campo, fonte),
    ),
    achadosLivres: achadosDasLinhas(linhas, consumidas, fonte),
  };
}

/** Linhas nao consumidas, na ordem em que o Textract as devolveu. */
function achadosDasLinhas(
  linhas: LinhaOcr[],
  consumidas: Set<LinhaOcr>,
  fonte: FonteImagem,
): AchadoLivre[] {
  return linhas
    .filter((linha) => !consumidas.has(linha))
    .map((linha) => ({
      texto: linha.texto,
      // Bloco sem `Confidence` entra com 0: achado livre so alerta, e o 0 diz
      // "sem lastro" em vez de fingir uma medicao que o servico nao deu.
      confianca: linha.confianca ?? 0,
      regiaoLeitura: linha.regiao,
      fotoEvidenciaId: fonte.fotoEvidenciaId,
    }));
}

function resolverNumericos(
  linhas: LinhaOcr[],
  alvos: CampoAlvo[],
  fonte: FonteImagem,
  porCampo: Map<string, LeituraExtraida>,
  consumidas: Set<LinhaOcr>,
): void {
  const alvosNumericos = alvos.filter(
    (alvo) => familiaDoCampo(alvo.campo) !== null,
  );
  if (alvosNumericos.length === 0) {
    return;
  }

  const candidatos = candidatosNumericos(linhas);
  const usados = new Set<CandidatoNumerico>();
  const pendentes: CampoAlvo[] = [];

  // Passo 1 — rotulo. So resolve quando a familia tem UM candidato livre;
  // dois numeros rotulados como serie na mesma foto e ambiguidade, nao pista.
  for (const alvo of alvosNumericos) {
    const familia = familiaDoCampo(alvo.campo);
    const daFamilia = candidatos.filter(
      (candidato) => !usados.has(candidato) && candidato.familia === familia,
    );

    if (daFamilia.length !== 1) {
      pendentes.push(alvo);
      continue;
    }

    const escolhido = daFamilia[0];
    usados.add(escolhido);
    consumidas.add(escolhido.linha);
    porCampo.set(
      alvo.campo,
      leituraDaLinha(alvo.campo, escolhido.valor, escolhido.linha, fonte),
    );
  }

  // Passo 2 — sem rotulo. Aceita apenas o caso 1-para-1 (tipico da foto de
  // chumbado, que so tem o numero gravado). Qualquer outra combinacao fica
  // nula: chutar qual numero e serie e qual e patrimonio nao e opcao.
  const livres = candidatos.filter(
    (candidato) => !usados.has(candidato) && candidato.familia === null,
  );
  if (livres.length === 1 && pendentes.length === 1) {
    const alvo = pendentes[0];
    consumidas.add(livres[0].linha);
    porCampo.set(
      alvo.campo,
      leituraDaLinha(alvo.campo, livres[0].valor, livres[0].linha, fonte),
    );
    return;
  }

  // Campo pendente fica com a leitura vazia registrada no inicio; quem loga o
  // caso e o adapter, que tem o Logger.
}

function candidatosNumericos(linhas: LinhaOcr[]): CandidatoNumerico[] {
  const rotulos = linhas
    .map((linha) => ({
      linha,
      familia: familiaDoTexto(linha.textoNormalizado),
    }))
    .filter(
      (item): item is { linha: LinhaOcr; familia: FamiliaNumerica } =>
        item.familia !== null,
    );

  const candidatos: CandidatoNumerico[] = [];

  for (const linha of linhas) {
    // Sem `g` residual entre linhas: `lastIndex` do regex global e estado.
    const numeros = linha.texto.match(new RegExp(PADRAO_NUMERO)) ?? [];
    if (numeros.length !== 1) {
      // Zero numeros: nao e candidato. Dois ou mais na mesma linha: nao da
      // para dizer qual e o valor do campo — descarta em vez de chutar.
      continue;
    }

    const soNumero = PADRAO_LINHA_SO_NUMERO.test(linha.texto);
    const familiaNaLinha = familiaDoTexto(linha.textoNormalizado);

    if (!soNumero && familiaNaLinha === null) {
      // Linha com numero embutido em texto que nao e rotulo conhecido
      // (ex.: uma norma tecnica) — nao e leitura de campo.
      continue;
    }

    candidatos.push({
      valor: numeros[0],
      linha,
      familia: familiaNaLinha ?? familiaVizinha(linha, rotulos),
    });
  }

  return candidatos;
}

/**
 * Rotulo mais proximo do numero quando ele esta em linha separada
 * ('N°' em cima, '847233' embaixo). Empate ou distancia grande devolve null.
 */
function familiaVizinha(
  linha: LinhaOcr,
  rotulos: { linha: LinhaOcr; familia: FamiliaNumerica }[],
): FamiliaNumerica | null {
  const centro = linha.centro;
  if (centro === null || rotulos.length === 0) {
    return null;
  }

  let melhor: { familia: FamiliaNumerica; distancia: number } | null = null;

  for (const rotulo of rotulos) {
    if (rotulo.linha === linha || rotulo.linha.centro === null) {
      continue;
    }
    const atual = distancia(centro, rotulo.linha.centro);
    if (atual > DISTANCIA_MAXIMA_ROTULO) {
      continue;
    }
    if (melhor === null || atual < melhor.distancia) {
      melhor = { familia: rotulo.familia, distancia: atual };
    }
  }

  return melhor?.familia ?? null;
}

function resolverTextuais(
  linhas: LinhaOcr[],
  alvos: CampoAlvo[],
  fonte: FonteImagem,
  porCampo: Map<string, LeituraExtraida>,
  consumidas: Set<LinhaOcr>,
): void {
  for (const alvo of alvos) {
    if (alvo.campo.startsWith('cliente-')) {
      const linha = linhas.reduce<LinhaOcr | null>((melhor, atual) => {
        if (contarLetras(atual.texto) === 0) {
          return melhor;
        }
        if (melhor === null) {
          return atual;
        }
        return contarLetras(atual.texto) > contarLetras(melhor.texto)
          ? atual
          : melhor;
      }, null);

      if (linha !== null) {
        consumidas.add(linha);
        porCampo.set(
          alvo.campo,
          leituraDaLinha(alvo.campo, linha.texto, linha, fonte),
        );
      }
      continue;
    }

    if (alvo.campo.startsWith('potencia-')) {
      const linha = linhas.find((atual) =>
        atual.textoNormalizado.includes('kva'),
      );
      if (linha !== undefined) {
        consumidas.add(linha);
        porCampo.set(
          alvo.campo,
          leituraDaLinha(alvo.campo, linha.texto, linha, fonte),
        );
      }
    }
  }
}

export class TextractExtractor extends ExtractorPort {
  readonly nome = 'textract';

  private readonly logger = new Logger(TextractExtractor.name);

  private readonly cliente: TextractClient;

  constructor(regiao: string) {
    super();
    this.cliente = new TextractClient({ region: regiao });
  }

  async extrair(
    fonte: FonteImagem,
    alvos: CampoAlvo[],
  ): Promise<ResultadoExtracao> {
    if (alvos.length === 0) {
      return { leituras: [], achadosLivres: [] };
    }

    // UMA chamada por foto. Sem retry proprio: o retry do SDK ja cobre falha
    // transitoria e reprocessar imagem em laco e exatamente o risco de custo
    // que a constraint 4 do SPEC proibe.
    const resposta = await this.cliente.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: new Uint8Array(fonte.imagem) },
      }),
    );

    const resultado = interpretarBlocos(resposta.Blocks ?? [], alvos, fonte);

    const semLeitura = resultado.leituras
      .filter((leitura) => leitura.valorLido === null)
      .map((leitura) => leitura.campo);
    if (semLeitura.length > 0) {
      this.logger.debug(
        `sem leitura segura em ${fonte.fonteFisica}: ${semLeitura.join(', ')} ` +
          `(${resposta.Blocks?.length ?? 0} bloco(s) do Textract)`,
      );
    }

    return resultado;
  }
}
