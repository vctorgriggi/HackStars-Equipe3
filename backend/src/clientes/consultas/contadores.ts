import { Conferencia } from '../../conferencias/domain/conferencia';
import { VinculoClienteTransformador } from '../../transformadores/infrastructure/persistence/transformador.repository';

export interface ContadoresDoCliente {
  totalPecas: number;
  pecasDivergentes: number;
}

/**
 * Agrega os vinculos peca ↔ cliente em contadores por cliente. Funcao PURA:
 * quem resolve a VIGENCIA (ultima conferencia por peca) e o repositorio de
 * conferencias — aqui so se le o `vereditoGeral` que a engine gravou; nada e
 * comparado nem recalculado (regra de ouro).
 *
 * Peca sem conferencia nao conta como divergente: ausencia de veredito nao e
 * afirmacao ("nunca fazer" do CLAUDE.md).
 */
export const contarPorCliente = (
  vinculos: VinculoClienteTransformador[],
  vigentes: Map<string, Conferencia>,
): Map<string, ContadoresDoCliente> => {
  const contadores = new Map<string, ContadoresDoCliente>();

  for (const { transformadorId, clienteId } of vinculos) {
    const atual = contadores.get(clienteId) ?? {
      totalPecas: 0,
      pecasDivergentes: 0,
    };
    atual.totalPecas += 1;
    if (vigentes.get(transformadorId)?.vereditoGeral === 'divergente') {
      atual.pecasDivergentes += 1;
    }
    contadores.set(clienteId, atual);
  }

  return contadores;
};
