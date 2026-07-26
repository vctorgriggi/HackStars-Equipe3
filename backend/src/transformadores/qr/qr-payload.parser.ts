import {
  PayloadEtiqueta,
  PayloadInvalidoError,
  ResultadoParse,
} from './payload-etiqueta';

// Formatos aceitos, e o que a MEDICAO de 2026-07-26 (zxing-cpp sobre
// fotos-demo/) mostrou dos QRs fisicos da peca de demo:
//
// - posicional: o QR da PLACA de identificacao — 10 linhas CRLF sem rotulo
//   nenhum, com o codigo de projeto TPD-408136 no meio. Formato REAL medido.
// - codigo: o QR da ETIQUETA adesiva — so '1001020511056', 13 digitos da mesma
//   familia dos EAN-13 impressos. Lookup, nao payload: sem ERP nesta rodada, o
//   caminho e a digitacao manual no front (T3.1).
// - JSON e chave:valor: formatos provaveis mantidos desde a T1.1 (a etiqueta
//   simulada da /demo usa chave:valor). Nenhum QR fisico produziu esses dois
//   ate agora — ficam porque o formato da TRAEL ainda nao foi confirmado.

type CampoEtiqueta =
  | 'numeroSerie'
  | 'patrimonio'
  | 'cliente'
  | 'pedido'
  | 'seq'
  | 'descricao'
  | 'codigoProjeto';

/**
 * Aliases aceitos, ja normalizados (sem acento, minusculos e sem separadores).
 * Cobre tanto as chaves do JSON quanto os rotulos impressos na etiqueta:
 * 'Núm. Série', 'Num. Serie', 'numero_serie', 'numSerie' -> 'numserie'/'numeroserie'.
 */
const ALIASES: Record<string, CampoEtiqueta | undefined> = {
  numeroserie: 'numeroSerie',
  numserie: 'numeroSerie',
  serie: 'numeroSerie',
  patrimonio: 'patrimonio',
  cliente: 'cliente',
  pedido: 'pedido',
  seq: 'seq',
  descricao: 'descricao',
  produto: 'descricao',
  codigoprojeto: 'codigoProjeto',
  projeto: 'codigoProjeto',
  tpd: 'codigoProjeto',
};

const CAMPOS_OBRIGATORIOS: CampoEtiqueta[] = ['numeroSerie', 'patrimonio'];

const REGEX_CODIGO_PROJETO = /TPD-\d+/i;
const REGEX_CODIGO_LOOKUP = /^[A-Za-z0-9\-_./]+$/;
const REGEX_DIACRITICOS = /[\u0300-\u036f]/g;
const PREFIXO_DESCRICAO = 'transformador';
const TAMANHO_MAXIMO_CODIGO = 64;

/**
 * Formato posicional (QR da placa). Linha inteira igual a um codigo de
 * projeto \u2014 'TPD-408136' na amostra, mas o prefixo nao e travado em TPD porque
 * o desenho da TRAEL tambem numera como EPT (decisao em aberto no SPEC).
 */
const REGEX_CODIGO_PROJETO_ANCORA = /^[A-Z]{2,4}-\d{4,}$/;
/** Identificador de peca: so digitos, 5+ (serie e patrimonio tem 6 na amostra). */
const REGEX_IDENTIFICADOR = /^\d{5,}$/;
const MINIMO_LINHAS_POSICIONAL = 9;
const DESLOCAMENTO_NUMERO_SERIE = 2;
const DESLOCAMENTO_PATRIMONIO = 6;
const TAMANHO_MAXIMO_TRECHO_ERRO = 40;

type Acumulador = Partial<Record<CampoEtiqueta, string>>;

function normalizarChave(chave: string): string {
  return chave
    .normalize('NFD')
    .replace(REGEX_DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function definirCampo(
  acumulador: Acumulador,
  campo: CampoEtiqueta,
  valor: string,
): void {
  const limpo = valor.trim();
  if (limpo.length === 0) {
    return;
  }
  // primeira ocorrencia vence (payload com aliases repetidos)
  if (acumulador[campo] !== undefined) {
    return;
  }
  acumulador[campo] = limpo;
}

function montarResultado(acumulador: Acumulador): ResultadoParse {
  const ausentes = CAMPOS_OBRIGATORIOS.filter(
    (campo) => acumulador[campo] === undefined,
  );
  const { numeroSerie, patrimonio } = acumulador;

  if (numeroSerie === undefined || patrimonio === undefined) {
    throw new PayloadInvalidoError(
      `campos-obrigatorios-ausentes: ${ausentes.join(', ')}`,
    );
  }

  const dados: PayloadEtiqueta = {
    numeroSerie,
    patrimonio,
    cliente: acumulador.cliente ?? null,
    pedido: acumulador.pedido ?? null,
    seq: acumulador.seq ?? null,
    descricao: acumulador.descricao ?? null,
    codigoProjeto: acumulador.codigoProjeto ?? null,
  };

  return { tipo: 'completo', dados };
}

function lerObjetoJson(payload: string): Record<string, unknown> | null {
  let valor: unknown;

  try {
    valor = JSON.parse(payload);
  } catch {
    return null;
  }

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return null;
  }

  return valor as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  if (typeof valor === 'string') {
    return valor;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return String(valor);
  }
  if (typeof valor === 'boolean') {
    return String(valor);
  }
  return null;
}

function parseJson(objeto: Record<string, unknown>): ResultadoParse {
  const acumulador: Acumulador = {};

  for (const [chave, valor] of Object.entries(objeto)) {
    const campo = ALIASES[normalizarChave(chave)];
    if (campo === undefined) {
      continue;
    }
    const conteudo = texto(valor);
    if (conteudo === null) {
      continue;
    }
    definirCampo(acumulador, campo, conteudo);
  }

  return montarResultado(acumulador);
}

function posicaoSeparador(linha: string): number {
  const doisPontos = linha.indexOf(':');
  const igual = linha.indexOf('=');

  if (doisPontos < 0) {
    return igual;
  }
  if (igual < 0) {
    return doisPontos;
  }
  return Math.min(doisPontos, igual);
}

/**
 * Retorna null quando nenhuma linha do payload foi reconhecida, permitindo
 * que o chamador conclua por 'formato-desconhecido'.
 */
function parseChaveValor(payload: string): ResultadoParse | null {
  const acumulador: Acumulador = {};
  let reconheceuAlgo = false;

  for (const linhaBruta of payload.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (linha.length === 0) {
      continue;
    }

    const separador = posicaoSeparador(linha);
    if (separador >= 0) {
      const campo = ALIASES[normalizarChave(linha.slice(0, separador))];
      if (campo === undefined) {
        continue;
      }
      reconheceuAlgo = true;
      definirCampo(acumulador, campo, linha.slice(separador + 1));
      continue;
    }

    const codigoProjeto = REGEX_CODIGO_PROJETO.exec(linha);
    if (codigoProjeto !== null) {
      reconheceuAlgo = true;
      definirCampo(acumulador, 'codigoProjeto', codigoProjeto[0]);
      continue;
    }

    if (linha.toLowerCase().startsWith(PREFIXO_DESCRICAO)) {
      reconheceuAlgo = true;
      definirCampo(acumulador, 'descricao', linha);
    }
  }

  if (!reconheceuAlgo) {
    return null;
  }

  return montarResultado(acumulador);
}

function linhasUteis(payload: string): string[] {
  return payload
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

/** Alguma linha e um `chave: valor` de alias conhecido? Rotulo vence posicao. */
function temRotuloConhecido(linhas: string[]): boolean {
  return linhas.some((linha) => {
    const separador = posicaoSeparador(linha);
    return (
      separador >= 0 &&
      ALIASES[normalizarChave(linha.slice(0, separador))] !== undefined
    );
  });
}

function trechoParaErro(valor: string): string {
  return valor.length > TAMANHO_MAXIMO_TRECHO_ERRO
    ? `${valor.slice(0, TAMANHO_MAXIMO_TRECHO_ERRO)}...`
    : valor;
}

/**
 * Le a linha do deslocamento e EXIGE que ela seja um identificador. Layout que
 * nao bate vira erro, nunca campo chutado: com amostra unica, a alternativa
 * seria gravar como "numero de serie esperado" uma data ou um codigo interno —
 * e valor esperado errado produz veredito errado (regra de ouro).
 */
function exigirIdentificador(
  linhas: string[],
  indice: number,
  rotuloErro: 'numero-serie' | 'patrimonio',
): string {
  const valor = linhas[indice];

  if (valor === undefined) {
    throw new PayloadInvalidoError(
      `posicional-${rotuloErro}-ausente: esperado na linha ${indice + 1}, ` +
        `o payload tem ${linhas.length} linhas uteis`,
    );
  }

  if (!REGEX_IDENTIFICADOR.test(valor)) {
    throw new PayloadInvalidoError(
      `posicional-${rotuloErro}-invalido: linha ${indice + 1} ` +
        `"${trechoParaErro(valor)}" nao e um identificador numerico`,
    );
  }

  return valor;
}

/**
 * Formato POSICIONAL do QR da placa de identificacao, medido em 2026-07-26:
 * linhas sem rotulo, separadas por CRLF, em que a posicao carrega o
 * significado. Amostra da peca de demo (10 linhas):
 *
 *   91616 / 19930 / TPD-408136 / 01/06/2026 / 847233 / 1 / 10 / 15 / 251328 /
 *   226/13299
 *
 * Corroborado por evidencia externa (etiqueta impressa e placa da mesma peca):
 * TPD-408136 e o projeto, 847233 a serie e 251328 o patrimonio. As demais
 * linhas (91616, 19930, 1, 226/13299) seguem SEM significado conhecido e nao
 * sao mapeadas; potencia (10) e classe (15) tampouco, porque "a potencia nao
 * vem do QR" continua valendo nesta rodada (ORIGENS_DO_ESPERADO intacto).
 *
 * Deteccao deliberadamente estreita — AMOSTRA UNICA: 9+ linhas uteis, nenhum
 * rotulo conhecido (senao e chave:valor) e EXATAMENTE um codigo de projeto,
 * que serve de ancora. Os deslocamentos sao RELATIVOS a ela, nunca indices
 * absolutos: e a unica linha auto-identificavel do payload.
 *
 * Retorna null quando o payload nao e posicional (cai nos outros formatos);
 * lanca quando ELE E posicional mas o layout nao confere.
 */
function parsePosicional(payload: string): ResultadoParse | null {
  const linhas = linhasUteis(payload);

  if (linhas.length < MINIMO_LINHAS_POSICIONAL || temRotuloConhecido(linhas)) {
    return null;
  }

  const ancoras = linhas.reduce<number[]>((indices, linha, indice) => {
    if (REGEX_CODIGO_PROJETO_ANCORA.test(linha)) {
      indices.push(indice);
    }
    return indices;
  }, []);

  // Zero ancoras: nao e este formato. Duas ou mais: ambiguo, e chutar qual e o
  // projeto deslocaria serie e patrimonio junto.
  if (ancoras.length !== 1) {
    return null;
  }

  const ancora = ancoras[0];
  const acumulador: Acumulador = {};

  definirCampo(acumulador, 'codigoProjeto', linhas[ancora]);
  definirCampo(
    acumulador,
    'numeroSerie',
    exigirIdentificador(
      linhas,
      ancora + DESLOCAMENTO_NUMERO_SERIE,
      'numero-serie',
    ),
  );
  definirCampo(
    acumulador,
    'patrimonio',
    exigirIdentificador(linhas, ancora + DESLOCAMENTO_PATRIMONIO, 'patrimonio'),
  );

  return montarResultado(acumulador);
}

function parseCodigo(payload: string): ResultadoParse | null {
  if (/[\r\n:={]/.test(payload)) {
    return null;
  }
  if (payload.length > TAMANHO_MAXIMO_CODIGO) {
    return null;
  }
  if (!REGEX_CODIGO_LOOKUP.test(payload)) {
    return null;
  }

  return { tipo: 'codigo', codigo: payload };
}

/**
 * Interpreta o conteudo lido do QR da peca (etiqueta adesiva ou placa).
 *
 * Ordem de tentativa: JSON -> posicional -> token unico (codigo de lookup) ->
 * chave:valor. O posicional vem cedo porque sua deteccao e a mais estreita
 * (9+ linhas, sem rotulo, uma ancora); o token unico vem antes de chave:valor
 * porque um payload como 'TPD-408136' sozinho e um identificador de lookup,
 * nao uma etiqueta incompleta.
 *
 * @throws PayloadInvalidoError com motivo 'payload-vazio',
 * 'formato-desconhecido', 'campos-obrigatorios-ausentes: ...' ou
 * 'posicional-{numero-serie|patrimonio}-{ausente|invalido}: ...'.
 */
export function parsePayloadEtiqueta(payload: string): ResultadoParse {
  const conteudo = typeof payload === 'string' ? payload.trim() : '';

  if (conteudo.length === 0) {
    throw new PayloadInvalidoError('payload-vazio');
  }

  const objetoJson = lerObjetoJson(conteudo);
  if (objetoJson !== null) {
    return parseJson(objetoJson);
  }

  const posicional = parsePosicional(conteudo);
  if (posicional !== null) {
    return posicional;
  }

  const codigo = parseCodigo(conteudo);
  if (codigo !== null) {
    return codigo;
  }

  const chaveValor = parseChaveValor(conteudo);
  if (chaveValor !== null) {
    return chaveValor;
  }

  throw new PayloadInvalidoError('formato-desconhecido');
}
