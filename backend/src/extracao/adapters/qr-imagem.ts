import { Logger } from '@nestjs/common';
import jsQR from 'jsqr';

import { PayloadEtiqueta } from '../../transformadores/qr/payload-etiqueta';
import { parsePayloadEtiqueta } from '../../transformadores/qr/qr-payload.parser';
import {
  AchadoLivre,
  CampoAlvo,
  FonteImagem,
  LeituraExtraida,
  ResultadoExtracao,
} from '../ports/extractor.port';
import {
  CaixaNormalizada,
  carregarSharp,
  dimensoesOrientadas,
  recorteLigado,
} from './recorte';

/**
 * O QR CODE DA PLACA COMO MARCACAO CONFERIVEL — decodificado LOCALMENTE.
 *
 * A placa de identificacao da TRAEL nao carrega so numeros impressos: ela tem
 * um QR proprio, e o conteudo dele foi medido em 2026-07-26 (o fixture e o
 * payload posicional estao em `transformadores/qr/qr-payload.parser.spec.ts`).
 * Na peca de demo esse QR diz `847233` — a serie CORRETA —, enquanto o numero
 * IMPRESSO na mesma placa diz `847833`. O defeito conhecido da peca e de
 * IMPRESSAO, e ate esta rodada o sistema nao tinha como notar isso: conferia o
 * texto da placa e ignorava a evidencia que estava a dois centimetros dele.
 *
 * TRES COISAS QUE ESTE ARQUIVO NAO FAZ, e sao as que importam:
 *
 * 1. NAO CHAMA AWS. Decodificar QR e aritmetica sobre pixels que ja estao na
 *    memoria — Reed-Solomon, nao OCR. Zero custo, zero rede, zero credito
 *    gasto (SPEC, constraint 4). O teto de 3 chamadas de visao por foto
 *    (`extractor.port.ts`) segue intacto: campo `*-qr` nao consome nenhuma;
 * 2. NAO COMPARA NADA. Produz `LeituraExtraida` como qualquer outro adapter, e
 *    quem julga continua sendo a engine (`conferencias/engine`);
 * 3. NAO REIMPLEMENTA O PARSER DO QR. O payload decodificado vai INTEIRO para
 *    `parsePayloadEtiqueta` — a mesma funcao que interpreta o QR lido pelo
 *    operador, com a mesma ancora `TPD-\d+` e os mesmos deslocamentos. Duas
 *    copias da regra posicional divergiriam, e o preco de divergir aqui e
 *    gravar como "lido na peca" um numero que o parser leria diferente.
 *
 * POR QUE `confianca: 1.0` E HONESTO AQUI (e por que nao e afrouxamento):
 * confianca, neste projeto, e "quanto o servico de visao acredita no que
 * leu" — e no relevo ela mede enquadramento, nao correcao (docs/visao-ocr.md).
 * QR nao tem esse eixo: o formato carrega correcao de erro Reed-Solomon e
 * verificacao de formato, entao ou os modulos fecham e o payload sai EXATO, ou
 * o decode devolve `null`. Nao existe "QR lido pela metade" nem "digito
 * trocado com 84% de certeza" — o modo de falha e ausencia, e ausencia ja e
 * `nao_conferivel` na engine. Reportar 0,9 aqui seria inventar uma duvida que
 * a fisica do formato nao tem; reportar 1,0 num OCR e que seria mentira.
 *
 * TODA FALHA E SEGURA, E O CAMINHO E SEMPRE O MESMO: sem `sharp`, com
 * `EXTRACAO_RECORTE=off`, foto sem QR, foto que nao decodifica, QR de outro
 * formato ou payload que o parser recusa -> o campo sai SEM leitura (nulo), a
 * engine o marca `nao_conferivel` e o operador ve ambar. Nunca uma excecao que
 * derrube a extracao das outras marcacoes da mesma foto, e nunca um valor
 * chutado.
 */

/**
 * Confianca de uma leitura que veio de decode de QR.
 *
 * Constante nomeada de proposito: `1` solto num objeto de leitura passaria por
 * revisao como descuido, e este e o UNICO 1,0 legitimo do sistema.
 */
export const CONFIANCA_DECODE_QR = 1;

/**
 * De onde sai o valor de cada campo, por PREFIXO do nome.
 *
 * Espelha `ORIGENS_DO_ESPERADO` (conferencias/conferencia-execucao.service.ts)
 * porque e o mesmo contrato de nomenclatura visto do outro lado: la o prefixo
 * acha o valor ESPERADO no QR da etiqueta, aqui ele acha o valor LIDO no QR da
 * placa. Sao tabelas separadas por dependencia, nao por decisao: a engine e o
 * fluxo nao podem importar `extracao`, e `extracao` nao importa `conferencias`.
 *
 * `cliente-` fica FORA: nao existe campo `cliente-*-qr` em checklist nenhuma, e
 * a comparacao de cliente e por token (a serigrafia diz 'Energisa', o QR diz a
 * razao social inteira) — um casamento que so faz sentido contra texto lido de
 * verdade, nao contra um payload estruturado.
 */
const ORIGENS_NO_QR: {
  prefixo: string;
  ler: (dados: PayloadEtiqueta) => string | null;
}[] = [
  { prefixo: 'serie-', ler: (dados) => dados.numeroSerie },
  { prefixo: 'patrimonio-', ler: (dados) => dados.patrimonio },
];

const logger = new Logger('QrImagem');

/** O que o decode devolve quando encontra um QR na foto. */
export interface QrDecodificado {
  /** Conteudo cru do QR, exatamente como o codigo o carrega (CRLF incluso). */
  payload: string;
  /**
   * Bounding box do QR na foto, no MESMO referencial e no MESMO formato JSON
   * do bounding box do Textract (0..1, imagem ja orientada por EXIF) — e o que
   * permite guardar em `regiaoLeitura` sem inventar um segundo formato.
   */
  regiaoLeitura: string | null;
}

/**
 * Retangulo alinhado aos eixos que cobre os quatro cantos do QR, normalizado
 * 0..1. Funcao PURA.
 *
 * O QR aparece em PERSPECTIVA numa foto de peca (na PLACA-5 real os cantos
 * saem torcidos em ~4 px), entao "a caixa" e o envelope dos cantos, nao um
 * quadrado. Sai limitado a 0..1: canto fora do quadro por erro de sub-pixel
 * nao produz coordenada negativa.
 */
export function caixaDosCantos(
  cantos: { x: number; y: number }[],
  largura: number,
  altura: number,
): CaixaNormalizada | null {
  if (cantos.length === 0 || largura <= 0 || altura <= 0) {
    return null;
  }

  const xs = cantos.map((canto) => canto.x);
  const ys = cantos.map((canto) => canto.y);

  if ([...xs, ...ys].some((valor) => !Number.isFinite(valor))) {
    return null;
  }

  const limitar = (valor: number): number => Math.min(1, Math.max(0, valor));
  const esquerda = limitar(Math.min(...xs) / largura);
  const topo = limitar(Math.min(...ys) / altura);
  const direita = limitar(Math.max(...xs) / largura);
  const base = limitar(Math.max(...ys) / altura);

  if (direita <= esquerda || base <= topo) {
    return null;
  }

  return {
    Left: esquerda,
    Top: topo,
    Width: direita - esquerda,
    Height: base - topo,
  };
}

/**
 * Foto -> QR decodificado, ou `null` quando nao ha o que ler. NUNCA lanca.
 *
 * EXIF, a mesma armadilha de `recorte.ts`: a foto de celular chega deitada com
 * frequencia e `metadata()` reporta as dimensoes CRUAS, nao as de depois da
 * rotacao. Aqui a fonte da verdade sao as dimensoes do buffer RGBA que o
 * proprio pipeline devolveu (`info`) — o array de pixels e indexado por elas, e
 * errar isso faria o jsQR varrer linhas trocadas e nao achar QR nenhum. O
 * `dimensoesOrientadas` da metadata entra como CONFERENCIA: se os dois
 * discordarem, e sinal de que a suposicao sobre `autoOrient` mudou de versao, e
 * isso precisa aparecer no log em vez de virar "nenhum QR encontrado" calado.
 *
 * Medido em 2026-07-26 nas fotos reais (`fotos-demo/`): PLACA-4 e PLACA-5
 * (orientation 6, 2304x4096 depois de orientar) decodificam o payload
 * posicional em ~270 ms; rasterizar custa ~30 ms. Nenhuma outra vista da peca
 * devolve esse QR — a LATERAL-DIREITA-2 devolve o QR da ETIQUETA (o codigo de
 * lookup de 13 digitos), que e outro codigo e outro assunto.
 */
export async function decodificarQr(
  imagem: Buffer,
): Promise<QrDecodificado | null> {
  if (!recorteLigado()) {
    return null;
  }

  const sharp = await carregarSharp();
  if (sharp === null) {
    return null;
  }

  try {
    const metadata = await sharp(imagem, { autoOrient: true }).metadata();
    const { data, info } = await sharp(imagem, { autoOrient: true })
      // RGBA: jsQR le 4 bytes por pixel. `ensureAlpha` cobre o JPEG (3 canais)
      // sem tocar no PNG que ja tem alfa.
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const esperadas = dimensoesOrientadas(
      metadata.width ?? 0,
      metadata.height ?? 0,
      metadata.orientation,
    );
    if (esperadas.largura !== info.width || esperadas.altura !== info.height) {
      logger.warn(
        `dimensoes-inesperadas no decode de QR: metadata orientada diz ` +
          `${esperadas.largura}x${esperadas.altura} e o buffer RGBA tem ` +
          `${info.width}x${info.height}; seguindo pelo buffer`,
      );
    }

    const codigo = jsQR(
      // Vista sobre os MESMOS bytes (sem copia): a foto de 2304x4096 ja custa
      // 37 MB em RGBA, e duplicar isso por foto seria caro sem motivo.
      new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      info.width,
      info.height,
    );

    if (codigo === null) {
      return null;
    }

    const caixa = caixaDosCantos(
      [
        codigo.location.topLeftCorner,
        codigo.location.topRightCorner,
        codigo.location.bottomRightCorner,
        codigo.location.bottomLeftCorner,
      ],
      info.width,
      info.height,
    );

    return {
      payload: codigo.data,
      regiaoLeitura: caixa === null ? null : JSON.stringify(caixa),
    };
  } catch (erro) {
    // Arquivo corrompido, formato que a lib nao decodifica, memoria: nada
    // disso pode derrubar a extracao das OUTRAS marcacoes da mesma foto.
    logger.warn(
      `decode de QR falhou (${
        erro instanceof Error ? erro.message : String(erro)
      }); os campos de QR desta foto ficam sem leitura`,
    );
    return null;
  }
}

/**
 * Payload cru do QR -> leituras dos alvos `*-qr` + achados livres. FUNCAO PURA
 * (sem I/O, sem sharp, sem SDK), no mesmo espirito de `interpretarBlocos` e da
 * engine: a regra que decide o que a visao AFIRMA tem de ser exercitavel sem
 * lib nativa e sem foto.
 *
 * TODA LINHA DO PAYLOAD QUE NAO VIRA LEITURA VAI PARA `achadosLivres`, pelo
 * mesmo motivo que as linhas nao consumidas do Textract vao: o dado ja esta
 * pago (aqui, de graca), e `cruzarAchados` sabe filtrar ruido sozinho — so
 * alarma texto que TEM CARA de identificador (so digitos, no comprimento dos
 * identificadores do proprio QR da etiqueta) e nao bate com nenhum valor dela.
 * Na peca de demo isso deixa `TPD-408136`, a data e os codigos internos de
 * fora, sem lista de excecoes.
 *
 * O ganho concreto: se um dia a placa trouxer um QR de OUTRA peca e o parser
 * recusar o formato, as linhas dele ainda passam pelo cruzamento — o alarme
 * sai por um caminho que nao depende de a checklist ter previsto o campo.
 */
export function mapearPayloadParaLeituras(
  payload: string,
  alvos: CampoAlvo[],
  fonte: FonteImagem,
  regiaoLeitura: string | null,
): ResultadoExtracao {
  const dados = interpretar(payload);

  const leituras: LeituraExtraida[] = alvos.map((alvo) => {
    const origem = ORIGENS_NO_QR.find((atual) =>
      alvo.campo.startsWith(atual.prefixo),
    );
    const valor =
      dados === null || origem === undefined ? null : origem.ler(dados);
    const valorLido = valor !== null && valor.trim().length > 0 ? valor : null;

    return {
      campo: alvo.campo,
      valorLido,
      // Sem valor nao ha lastro: `null` e o que a engine le como "sem leitura".
      confianca: valorLido === null ? null : CONFIANCA_DECODE_QR,
      regiaoLeitura: valorLido === null ? null : regiaoLeitura,
      fotoEvidenciaId: fonte.fotoEvidenciaId,
      // `corroboracao` fica AUSENTE de proposito: ausente significa "nao se
      // aplica" (`extractor.port.ts`), o estado de toda marcacao que nao e
      // relevo. E o que mantem o campo do QR ACUSAVEL com uma leitura so —
      // pela mesma razao que a placa impressa continua acusavel.
    };
  });

  const consumidos = new Set(
    leituras
      .map((leitura) => leitura.valorLido?.trim())
      .filter((valor): valor is string => valor !== undefined),
  );

  const achadosLivres: AchadoLivre[] = payload
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0 && !consumidos.has(linha))
    .map((linha) => ({
      texto: linha,
      confianca: CONFIANCA_DECODE_QR,
      regiaoLeitura,
      fotoEvidenciaId: fonte.fotoEvidenciaId,
    }));

  return { leituras, achadosLivres };
}

/**
 * Payload -> campos da etiqueta, ou `null` quando o parser nao reconhece.
 *
 * `tipo: 'codigo'` (QR que so carrega um codigo de lookup, como o da etiqueta
 * adesiva real) tambem vira `null`: codigo de lookup nao afirma serie nem
 * patrimonio, e resolve-lo exigiria ERP, que nao existe nesta rodada.
 */
function interpretar(payload: string): PayloadEtiqueta | null {
  try {
    const resultado = parsePayloadEtiqueta(payload);
    return resultado.tipo === 'completo' ? resultado.dados : null;
  } catch {
    // `PayloadInvalidoError` e qualquer outra coisa: QR ilegivel para nos e
    // campo sem leitura, nunca erro que derrube a foto. As linhas seguem para
    // `achadosLivres`, que e onde um payload estranho ainda pode alarmar.
    return null;
  }
}

/**
 * Foto + alvos `*-qr` -> leituras. E o metodo que o adapter chama; a divisao
 * entre isto e `mapearPayloadParaLeituras` e a mesma de sempre: aqui mora o
 * I/O, la mora a regra.
 */
export async function lerQrDaFoto(
  fonte: FonteImagem,
  alvos: CampoAlvo[],
): Promise<ResultadoExtracao> {
  if (alvos.length === 0) {
    return { leituras: [], achadosLivres: [] };
  }

  const decodificado = await decodificarQr(fonte.imagem);

  if (decodificado === null) {
    logger.debug(
      `sem QR decodificavel em ${fonte.fonteFisica} (foto ` +
        `${fonte.fotoEvidenciaId}): ${alvos.length} campo(s) sem leitura`,
    );

    return {
      leituras: alvos.map((alvo) => ({
        campo: alvo.campo,
        valorLido: null,
        confianca: null,
        regiaoLeitura: null,
        fotoEvidenciaId: fonte.fotoEvidenciaId,
      })),
      achadosLivres: [],
    };
  }

  logger.debug(
    `qr-decodificado em ${fonte.fonteFisica} (foto ${fonte.fotoEvidenciaId}): ` +
      `${decodificado.payload.length} caracteres, zero chamada de visao`,
  );

  return mapearPayloadParaLeituras(
    decodificado.payload,
    alvos,
    fonte,
    decodificado.regiaoLeitura,
  );
}
