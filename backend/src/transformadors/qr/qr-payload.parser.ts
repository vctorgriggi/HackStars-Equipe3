import {
  PayloadEtiqueta,
  PayloadInvalidoError,
  ResultadoParse,
} from './payload-etiqueta';

// PENDENTE (T1.1): o formato real do payload do QR da etiqueta ainda nao foi
// decodificado (decisao em aberto do projeto). Este parser cobre os formatos
// provaveis (JSON, chave:valor e token unico de lookup). Ao decodificar a
// etiqueta real, adicionar a fixture correspondente no spec e ajustar aqui.

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
 * Interpreta o conteudo lido do QR da etiqueta.
 *
 * Ordem de tentativa: JSON -> token unico (codigo de lookup) -> chave:valor.
 * O token unico vem antes de chave:valor porque um payload como 'TPD-408136'
 * sozinho e um identificador de lookup, nao uma etiqueta incompleta.
 *
 * @throws PayloadInvalidoError com motivo 'payload-vazio',
 * 'formato-desconhecido' ou 'campos-obrigatorios-ausentes: ...'.
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
