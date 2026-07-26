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
import { ehMarcacaoEmRelevo } from '../ports/marcacao';
import {
  CaixaNormalizada,
  ImagemRecortavel,
  abrirImagem,
  areaDaIntersecao,
  lerCaixa,
} from './recorte';

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
 *
 *    ISSO GANHOU PESO com `fonteFisica` por VISTA: uma vista declara mais de
 *    um alvo (o topo pede serie chumbada E patrimonio serigrafado), entao a
 *    foto que so mostra um numero legivel cai fora do caso 1-para-1 e sai
 *    nula. E o comportamento CORRETO, e e a correcao estrutural do bug medido
 *    da tampa: com `chumbado-1` como fonte, a mesma foto tinha UM alvo so e o
 *    patrimonio em tinta preta era casado com o campo da serie chumbada — o
 *    numero errado entregue com confianca alta. Fixado em
 *    textract.extractor.spec.ts ("vista com duas marcacoes");
 * 4. `cliente-*` -> linha com mais letras;
 * 5. `potencia-*` -> linha que contem 'kVA'.
 *
 * Prefixo desconhecido sai como leitura nula — o adapter nunca inventa campo
 * fora dos alvos recebidos.
 *
 * CORROBORACAO POR RECORTE (2026-07-25): depois da heuristica acima, toda
 * leitura de marcacao em RELEVO (`ports/marcacao.ts`) e relida em dois
 * recortes da propria regiao — resolucao nativa, sem filtro. O metodo
 * `corroborarRelevos` conta o porque com os numeros que o motivaram; o teto de
 * chamadas por foto continua fixo (3) e sem laco.
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

/**
 * Margens dos recortes de corroboracao, em fracao do lado do bounding box
 * acrescentada de cada lado. Duas, medidas no spike de 2026-07-25: uma
 * apertada (contexto minimo) e uma folgada (o dobro do enquadramento).
 *
 * Ver `recorte.ts` para o que foi medido e o que foi REPROVADO (ampliar,
 * filtrar pixel, consenso entre motores diferentes).
 */
const MARGENS_DE_CORROBORACAO = [0.5, 1.5];

/**
 * TETO ABSOLUTO de chamadas de visao por foto (constraint 4 do SPEC): 1 da
 * foto inteira + 2 recortes. E teto, nao meta — leitura que nao couber no
 * orcamento sai `nao-confirmada`, que e seguro (nunca vira `conforme` a mais).
 *
 * Consequencia deliberada: UMA leitura em relevo por foto e corroborada, na
 * ordem da checklist. Na peca da TRAEL cada vista tem uma serie chumbada so,
 * entao o teto nao aperta nada hoje; se um dia apertar, a resposta certa e
 * mais fotos (uma por marcacao), nao mais chamadas por foto.
 */
const MAXIMO_DE_CHAMADAS_POR_FOTO = 1 + MARGENS_DE_CORROBORACAO.length;

/** Valor que faz sentido corroborar por recorte: identificador numerico. */
const PADRAO_VALOR_CORROBORAVEL = /^\d{6,}$/;

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

  // Passo 2 — sem rotulo. Aceita apenas o caso 1-para-1: UM numero livre para
  // UM campo pendente (a vista que carrega uma marcacao numerica so, como a
  // traseira). Qualquer outra combinacao fica nula: chutar qual numero e serie
  // e qual e patrimonio nao e opcao. Numa vista com dois alvos (topo: serie
  // chumbada + patrimonio serigrafado) um unico numero legivel NAO resolve
  // nada — os dois campos saem nulos e viram `nao_conferivel`, que e o
  // veredito honesto para "vi uma marcacao das duas e nao sei qual".
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

/**
 * Valor lido NA REGIAO indicada por `ancora`, dentro dos blocos de um recorte.
 * Funcao PURA (mesmo espirito de `interpretarBlocos`): e a regra que decide se
 * um recorte corroborou a leitura, e precisa ser exercitavel sem AWS.
 *
 * ANCORAGEM, e nao "algum numero do recorte": o recorte pode conter marcacoes
 * vizinhas (o topo da peca tem serie chumbada E patrimonio serigrafado), e
 * aceitar qualquer numero deixaria o vizinho corroborar a leitura errada —
 * o mesmo bug de troca de campo que a heuristica principal ja evita.
 * Vence a linha numerica de MAIOR sobreposicao com a ancora; sem sobreposicao,
 * nenhuma.
 */
export function lerValorAncorado(
  blocos: Block[],
  ancora: CaixaNormalizada,
): { valor: string; confianca: number | null } | null {
  let melhor: {
    valor: string;
    confianca: number | null;
    sobreposicao: number;
  } | null = null;

  for (const linha of lerLinhas(blocos)) {
    const numeros = linha.texto.match(new RegExp(PADRAO_NUMERO)) ?? [];
    if (numeros.length !== 1 || linha.regiao === null) {
      continue;
    }

    const caixa = JSON.parse(linha.regiao) as CaixaNormalizada;
    const sobreposicao = areaDaIntersecao(caixa, ancora);
    if (sobreposicao <= 0) {
      continue;
    }

    if (melhor === null || sobreposicao > melhor.sobreposicao) {
      melhor = { valor: numeros[0], confianca: linha.confianca, sobreposicao };
    }
  }

  return melhor === null
    ? null
    : { valor: melhor.valor, confianca: melhor.confianca };
}

/** Menor confianca do conjunto; `null` (sem lastro) contamina o resultado. */
export function menorConfianca(valores: (number | null)[]): number | null {
  return valores.some((valor) => valor === null)
    ? null
    : Math.min(...(valores as number[]));
}

/**
 * Recorte menor que isto nao vale a chamada: OCR em algumas dezenas de pixels
 * nao le, e a chamada e paga do mesmo jeito (constraint 4 do SPEC).
 */
const MINIMO_PX_DO_RECORTE = 32;

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

    // Chamada 1 de no maximo 3 (teto em MAXIMO_DE_CHAMADAS_POR_FOTO): a foto
    // inteira. Sem retry proprio — o retry do SDK ja cobre falha transitoria e
    // reprocessar imagem em laco e o risco de custo que a constraint 4 proibe.
    const resposta = await this.detectar(fonte.imagem);
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

    return {
      ...resultado,
      leituras: await this.corroborarRelevos(fonte, resultado.leituras),
    };
  }

  private detectar(imagem: Buffer) {
    return this.cliente.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: new Uint8Array(imagem) },
      }),
    );
  }

  /**
   * CONSENSO DE RECORTES para marcacao em relevo — o coracao da mudanca de
   * 2026-07-25.
   *
   * O problema medido: na serie CHUMBADA (relevo da cor do tanque) a confianca
   * do Textract mede ENQUADRAMENTO, nao correcao. Mesmo valor correto, mesma
   * foto, so mudando a margem: 37,3% a 95,5%. E `847233 @ 84,3%` (certo) contra
   * `847833 @ 84,6%` (errado) — 0,3 ponto separando verdades opostas. NENHUM
   * limiar corta essa faixa, entao a saida nao e um numero melhor: e uma
   * segunda evidencia.
   *
   * O que este metodo faz por leitura em relevo: recorta a MESMA regiao do
   * buffer ORIGINAL com duas margens, na resolucao nativa e sem filtro de
   * pixel, e rele. Aceita o valor so se os tres textos coincidirem; a confianca
   * final e a MENOR das tres (a mais pessimista das evidencias).
   *
   * Os dois desfechos possiveis quando nao ha consenso, e por que sao
   * diferentes:
   * - RECORTE LEU OUTRO VALOR -> `valorLido` vai a NULO. Ha contradicao
   *   explicita, e uma leitura contradita nao pode nem sustentar `conforme`
   *   (era o caminho do falso OK). Nunca se escolhe uma vencedora — voto nao
   *   aprova peca.
   * - RECORTE NAO LEU NADA NAQUELA REGIAO (ou nem houve recorte: lib ausente,
   *   env `EXTRACAO_RECORTE=off`, foto sem bounding box, orcamento gasto) ->
   *   valor PRESERVADO com `corroboracao: 'nao-confirmada'`. Nao ha
   *   contradicao, so falta de segunda evidencia: rebaixar isso a nulo faria
   *   uma falha de infraestrutura zerar as leituras boas da peca (e derrubar o
   *   critorio 3 do SPEC, "conjunto conforme"). A corroboracao NUNCA promove
   *   nada — quando ela nao roda, o sistema volta exatamente ao que era antes,
   *   com a diferenca de que a engine se recusa a ACUSAR sem ela
   *   (`engine/corroboracao.ts`).
   */
  private async corroborarRelevos(
    fonte: FonteImagem,
    leituras: LeituraExtraida[],
  ): Promise<LeituraExtraida[]> {
    if (!leituras.some(exigeCorroboracao)) {
      return leituras;
    }

    const imagem = await abrirImagem(fonte.imagem);
    let orcamento = MAXIMO_DE_CHAMADAS_POR_FOTO - 1;
    const saida: LeituraExtraida[] = [];

    for (const leitura of leituras) {
      if (!exigeCorroboracao(leitura)) {
        saida.push(leitura);
        continue;
      }

      const caixa = lerCaixa(leitura.regiaoLeitura);

      if (imagem === null) {
        saida.push(
          this.semCorroboracao(fonte, leitura, 'recorte-indisponivel'),
        );
        continue;
      }
      if (caixa === null) {
        saida.push(
          this.semCorroboracao(fonte, leitura, 'leitura-sem-bounding-box'),
        );
        continue;
      }
      if (!PADRAO_VALOR_CORROBORAVEL.test((leitura.valorLido ?? '').trim())) {
        saida.push(this.semCorroboracao(fonte, leitura, 'valor-nao-numerico'));
        continue;
      }
      if (orcamento < MARGENS_DE_CORROBORACAO.length) {
        saida.push(
          this.semCorroboracao(
            fonte,
            leitura,
            'orcamento-de-chamadas-esgotado',
          ),
        );
        continue;
      }

      orcamento -= MARGENS_DE_CORROBORACAO.length;
      saida.push(await this.corroborar(fonte, leitura, imagem, caixa));
    }

    return saida;
  }

  /** Marca a leitura como nao corroborada e diz alto por que. */
  private semCorroboracao(
    fonte: FonteImagem,
    leitura: LeituraExtraida,
    motivo: string,
  ): LeituraExtraida {
    this.logger.warn(
      `leitura-nao-corroborada: ${leitura.campo} em ${fonte.fonteFisica} ` +
        `(${motivo}); a engine nao vai ACUSAR este campo com esta leitura`,
    );

    return { ...leitura, corroboracao: 'nao-confirmada' };
  }

  private async corroborar(
    fonte: FonteImagem,
    leitura: LeituraExtraida,
    imagem: ImagemRecortavel,
    caixa: CaixaNormalizada,
  ): Promise<LeituraExtraida> {
    const esperado = normalizar((leitura.valorLido ?? '').trim());
    const confiancas: (number | null)[] = [leitura.confianca];

    for (const margem of MARGENS_DE_CORROBORACAO) {
      const recorte = await imagem.recortar(caixa, margem);
      if (
        recorte === null ||
        recorte.retangulo.width < MINIMO_PX_DO_RECORTE ||
        recorte.retangulo.height < MINIMO_PX_DO_RECORTE
      ) {
        this.logger.warn(
          `leitura-nao-corroborada: ${leitura.campo} em ${fonte.fonteFisica} ` +
            `(recorte de margem ${margem} nao produzido ou pequeno demais)`,
        );
        return { ...leitura, corroboracao: 'nao-confirmada' };
      }

      this.logger.debug(
        `chamada-de-visao: recorte de ${leitura.campo} (margem ${margem}, ` +
          `${recorte.retangulo.width}x${recorte.retangulo.height} px) na foto ` +
          `${fonte.fotoEvidenciaId}`,
      );

      let ancorado: { valor: string; confianca: number | null } | null;
      try {
        const resposta = await this.detectar(recorte.imagem);
        ancorado = lerValorAncorado(
          resposta.Blocks ?? [],
          recorte.caixaNoRecorte,
        );
      } catch (erro) {
        // Falha da releitura NAO derruba a leitura original: sem contradicao,
        // so falta de corroboracao.
        this.logger.warn(
          `leitura-nao-corroborada: ${leitura.campo} em ${fonte.fonteFisica} ` +
            `(recorte de margem ${margem} falhou: ` +
            `${erro instanceof Error ? erro.message : String(erro)})`,
        );
        return { ...leitura, corroboracao: 'nao-confirmada' };
      }

      if (ancorado === null) {
        this.logger.warn(
          `leitura-nao-corroborada: ${leitura.campo} em ${fonte.fonteFisica} ` +
            `(recorte de margem ${margem} nao leu nada na regiao)`,
        );
        return { ...leitura, corroboracao: 'nao-confirmada' };
      }

      if (normalizar(ancorado.valor) !== esperado) {
        this.logger.warn(
          `recortes-discordam: ${leitura.campo} em ${fonte.fonteFisica} leu ` +
            `"${leitura.valorLido}" na foto inteira e "${ancorado.valor}" no ` +
            `recorte de margem ${margem}; leitura descartada ` +
            `(nao_conferivel, nunca uma vencedora eleita)`,
        );
        return {
          ...leitura,
          valorLido: null,
          confianca: null,
          regiaoLeitura: null,
          corroboracao: 'nao-confirmada',
        };
      }

      confiancas.push(ancorado.confianca);
    }

    return {
      ...leitura,
      // A MENOR das tres: a confianca que sobra e a da pior evidencia, nunca a
      // media (media inventa lastro que nenhuma leitura teve).
      confianca: menorConfianca(confiancas),
      corroboracao: 'confirmada',
    };
  }
}

/** Leitura que a politica manda corroborar: marcacao em relevo COM valor. */
function exigeCorroboracao(leitura: LeituraExtraida): boolean {
  return (
    ehMarcacaoEmRelevo(leitura.campo) &&
    leitura.valorLido !== null &&
    leitura.valorLido.trim().length > 0
  );
}
