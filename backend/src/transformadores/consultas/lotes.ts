import { Conferencia } from '../../conferencias/domain/conferencia';
import { Passagem } from '../../passagens/domain/passagem';
import { VinculoLoteTransformador } from '../infrastructure/persistence/transformador.repository';

export interface ResumoDoLote {
  totalPecas: number;
  pecasDivergentes: number;
  cliente: string | null;
  projetoCodigo: string | null;
  progressoPct: number;
}

/**
 * Agrega as pecas de cada pedido no resumo que a tela de lotes exibe.
 * Funcao PURA (mesmo desenho de `contarPorCliente`): a vigencia e a ultima
 * passagem chegam resolvidas dos repositorios — aqui so se le o
 * `vereditoGeral` que a engine gravou e a `ordem` do checkpoint; nada e
 * comparado nem recalculado (regra de ouro).
 *
 * Regras de ausencia (nunca afirmacao):
 * - peca sem conferencia nao conta como divergente;
 * - peca sem passagem contribui 0 ao progresso (ainda nao entrou na linha);
 * - cliente/projeto MISTOS dentro do pedido viram null — anunciar "nao ha um
 *   so" informa melhor que eleger um dos dois em silencio; o sentinela ''
 *   (coluna NOT NULL sem valor, T1.3) tambem vira null.
 */
export const resumirLotes = (
  vinculos: VinculoLoteTransformador[],
  vigentes: Map<string, Conferencia>,
  ultimasPassagens: Map<string, Passagem>,
  ordemMaxima: number,
): Map<string, ResumoDoLote> => {
  const somaOrdens = new Map<string, number>();
  const resumos = new Map<string, ResumoDoLote>();

  for (const vinculo of vinculos) {
    const { transformadorId, pedido } = vinculo;
    const cliente = vinculo.cliente || null;
    const projetoCodigo = vinculo.projetoCodigo || null;

    const atual = resumos.get(pedido);
    const resumo: ResumoDoLote = atual ?? {
      totalPecas: 0,
      pecasDivergentes: 0,
      cliente,
      projetoCodigo,
      progressoPct: 0,
    };

    resumo.totalPecas += 1;
    if (vigentes.get(transformadorId)?.vereditoGeral === 'divergente') {
      resumo.pecasDivergentes += 1;
    }
    if (atual && atual.cliente !== cliente) {
      resumo.cliente = null;
    }
    if (atual && atual.projetoCodigo !== projetoCodigo) {
      resumo.projetoCodigo = null;
    }

    somaOrdens.set(
      pedido,
      (somaOrdens.get(pedido) ?? 0) +
        (ultimasPassagens.get(transformadorId)?.checkpoint.ordem ?? 0),
    );

    resumos.set(pedido, resumo);
  }

  for (const [pedido, resumo] of resumos) {
    resumo.progressoPct =
      ordemMaxima > 0
        ? Math.round(
            (100 * (somaOrdens.get(pedido) ?? 0)) /
              (resumo.totalPecas * ordemMaxima),
          )
        : 0;
  }

  return resumos;
};
