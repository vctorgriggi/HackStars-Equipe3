import {
  Indicadores,
  IndicadorPorCampo,
  IndicadorPorEtapa,
  PecaNaLinha,
  UltimaConferenciaNaLinha,
  UltimaPassagemNaLinha,
} from '../dto/indicadores.dto';
import { EtapaResumo } from '../dto/resumos-compartilhados.dto';
import { Veredito } from '../engine/tipos';

/**
 * Linhas cruas de contagem -> o payload de `GET /conferencias/indicadores`.
 * FUNÇÃO PURA: recebe o que o SQL já agrupou e não toca repositório, storage
 * nem AWS. Todo o `COUNT`/`GROUP BY` acontece no banco (ver
 * `IndicadoresService`); aqui só se junta, ordena e nomeia.
 *
 * REGRA NOVA AQUI: NENHUMA. Nada nesta função compara valor esperado com valor
 * lido, e nenhum veredito nasce dela — os vereditos chegam prontos, do jeito
 * que a engine os gravou, e a função só os CONTA. É o que permite um endpoint
 * de dashboard sem ferir a regra de ouro.
 *
 * O que a função DECIDE, e por quê:
 * - veredito que não é um dos três da engine (inclusive `null`, das linhas
 *   cruas do CRUD) entra no total e em NENHUM balde. Somá-lo ao balde errado
 *   inventaria conformidade que ninguém emitiu;
 * - `porEtapa` sai na ordem da linha, com o grupo sem etapa por último: ele é
 *   a conferência da peça inteira, não uma posição da fábrica;
 * - `porCampo` sai por divergentes desc (depois não conferíveis desc, depois
 *   nome): o topo da lista é onde investigar primeiro. Campo que só acumula
 *   `nao_conferivel` também é problema — de captura, não de peça — e por isso
 *   é o segundo critério, e não o alfabeto;
 * - `linha` sai pela passagem mais recente: é a ordem em que a peça anda na
 *   fábrica. Peça sem passagem vai para o fim (não está em lugar nenhum da
 *   linha), desempatada pela conferência mais recente e depois pelo número de
 *   série — desempate estável importa numa tela que recarrega sozinha.
 */

/** Uma linha de `GROUP BY (checkpoint, vereditoGeral)` sobre `conferencia`. */
export interface ContagemDeConferencia {
  /** Etapa da conferência; `null` quando ela não tem checkpoint. */
  etapa: EtapaResumo | null;
  /** `conferencia.vereditoGeral` como está no banco. */
  veredito: string | null;
  quantidade: number;
}

/** Uma linha de `GROUP BY (nomeCampo, veredito)` sobre `campo_conferido`. */
export interface ContagemDeCampo {
  campo: string;
  veredito: string | null;
  quantidade: number;
}

/** Uma peça com o que o SQL já resolveu dela: onde está e como está. */
export interface LinhaDaPeca {
  transformadorId: string;
  numeroSerie: string;
  patrimonio: string | null;
  ultimaPassagem: UltimaPassagemNaLinha | null;
  ultimaConferencia: UltimaConferenciaNaLinha | null;
}

export interface EntradaIndicadores {
  conferencias: ContagemDeConferencia[];
  campos: ContagemDeCampo[];
  /**
   * As peças que entram no dashboard — já recortadas pelo teto no SQL. O total
   * verdadeiro vem em `totalPecas`, e é a diferença entre os dois que denuncia
   * o corte para a tela.
   */
  pecas: LinhaDaPeca[];
  totalPecas: number;
  totalPassagens: number;
}

/** Os três baldes de contagem, sempre presentes (zero é resposta). */
interface Baldes {
  divergentes: number;
  naoConferiveis: number;
  conformes: number;
}

const BALDE_POR_VEREDITO: Record<Veredito, keyof Baldes> = {
  divergente: 'divergentes',
  nao_conferivel: 'naoConferiveis',
  conforme: 'conformes',
};

export function montarIndicadores(entrada: EntradaIndicadores): Indicadores {
  return {
    totais: {
      conferencias: somar(entrada.conferencias),
      ...acumular(entrada.conferencias),
      pecas: entrada.totalPecas,
      passagens: entrada.totalPassagens,
    },
    porEtapa: agruparPorEtapa(entrada.conferencias),
    porCampo: agruparPorCampo(entrada.campos),
    linha: ordenarLinha(entrada.pecas),
  };
}

function baldesZerados(): Baldes {
  return { divergentes: 0, naoConferiveis: 0, conformes: 0 };
}

function somar(linhas: { quantidade: number }[]): number {
  return linhas.reduce((total, linha) => total + linha.quantidade, 0);
}

/**
 * Distribui as quantidades nos três baldes. Veredito fora da união da engine
 * (ou `null`) é IGNORADO de propósito: ele já foi contado no total, e chutar
 * um balde para ele fabricaria conformidade — ou divergência — que ninguém
 * emitiu.
 */
function acumular(
  linhas: { veredito: string | null; quantidade: number }[],
): Baldes {
  const baldes = baldesZerados();

  for (const linha of linhas) {
    contabilizar(baldes, linha);
  }

  return baldes;
}

function contabilizar(
  baldes: Baldes,
  linha: { veredito: string | null; quantidade: number },
): void {
  const balde = BALDE_POR_VEREDITO[linha.veredito as Veredito] as
    | keyof Baldes
    | undefined;

  if (balde) {
    baldes[balde] += linha.quantidade;
  }
}

function agruparPorEtapa(linhas: ContagemDeConferencia[]): IndicadorPorEtapa[] {
  // Chave por `codigo` (identificador estável), nunca por nome nem por ordem —
  // os dois mudam. `null` tem chave própria: é o grupo "peça inteira".
  const grupos = new Map<string | null, IndicadorPorEtapa>();

  for (const linha of linhas) {
    const chave = linha.etapa?.codigo ?? null;
    const grupo = grupos.get(chave) ?? {
      etapa: linha.etapa,
      ...baldesZerados(),
    };

    contabilizar(grupo, linha);
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].sort((a, b) => {
    // Sem etapa é sempre o último: não é posição da linha, é a peça inteira.
    if (!a.etapa || !b.etapa) {
      return (a.etapa ? 0 : 1) - (b.etapa ? 0 : 1);
    }
    return (
      a.etapa.ordem - b.etapa.ordem ||
      a.etapa.codigo.localeCompare(b.etapa.codigo)
    );
  });
}

function agruparPorCampo(linhas: ContagemDeCampo[]): IndicadorPorCampo[] {
  const grupos = new Map<string, IndicadorPorCampo>();

  for (const linha of linhas) {
    const grupo = grupos.get(linha.campo) ?? {
      campo: linha.campo,
      ...baldesZerados(),
    };

    contabilizar(grupo, linha);
    grupos.set(linha.campo, grupo);
  }

  return [...grupos.values()].sort(
    (a, b) =>
      b.divergentes - a.divergentes ||
      b.naoConferiveis - a.naoConferiveis ||
      a.campo.localeCompare(b.campo),
  );
}

/**
 * Peça que se moveu por último aparece primeiro. Quem nunca passou por
 * checkpoint nenhum vai para o fim — não está em posição alguma da linha —, e
 * lá dentro vale a conferência mais recente e, por fim, o número de série (o
 * desempate estável: sem ele, duas peças sem histórico trocariam de lugar a
 * cada refresh da tela).
 */
function ordenarLinha(pecas: LinhaDaPeca[]): PecaNaLinha[] {
  return [...pecas].sort(
    (a, b) =>
      maisRecente(a.ultimaPassagem?.em, b.ultimaPassagem?.em) ||
      maisRecente(a.ultimaConferencia?.em, b.ultimaConferencia?.em) ||
      a.numeroSerie.localeCompare(b.numeroSerie),
  );
}

/**
 * Timestamp maior primeiro; ausente por último. Empate devolve 0.
 *
 * Comparação TEXTUAL, e não `new Date(...)`: os dois lados chegam em ISO-8601
 * UTC (`toISOString()`, imposto por quem monta a entrada), formato em que a
 * ordem lexicográfica É a ordem cronológica — e que não perde precisão nem
 * inventa fuso.
 */
function maisRecente(a: string | undefined, b: string | undefined): number {
  if (a === b) {
    return 0;
  }
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  return a < b ? 1 : -1;
}
