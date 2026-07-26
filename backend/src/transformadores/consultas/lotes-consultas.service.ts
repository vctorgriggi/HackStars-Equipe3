import { Injectable } from '@nestjs/common';

import { CheckpointRepository } from '../../checkpoints/infrastructure/persistence/checkpoint.repository';
import { ConferenciaRepository } from '../../conferencias/infrastructure/persistence/conferencia.repository';
import { PassagemRepository } from '../../passagens/infrastructure/persistence/passagem.repository';
import { IPaginationOptions } from '../../utils/types/pagination-options';

import { TransformadorRepository } from '../infrastructure/persistence/transformador.repository';
import { LoteResumo } from './lote-resumo';
import { resumirLotes } from './lotes';

/**
 * Listagem de lotes com o resumo derivado no servidor (precedente:
 * `ClientesConsultasService`). Lote nao e entidade — e o recorte das pecas
 * pelo `pedido` — entao a "pagina" e uma pagina de pedidos distintos, e as
 * agregacoes rodam so sobre as pecas desses pedidos.
 *
 * Vigencia e etapa atual reusam os DISTINCT ON unicos do sistema
 * (`findUltimaPorTransformadores` de conferencia e passagem) — nunca uma
 * segunda resolucao independente.
 */
@Injectable()
export class LotesConsultasService {
  constructor(
    private readonly transformadorRepository: TransformadorRepository,

    private readonly conferenciaRepository: ConferenciaRepository,

    private readonly passagemRepository: PassagemRepository,

    private readonly checkpointRepository: CheckpointRepository,
  ) {}

  async listarResumos({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LoteResumo[]> {
    const pedidos = await this.transformadorRepository.findPedidosPaginados({
      paginationOptions,
    });

    const vinculos =
      await this.transformadorRepository.findVinculosPorPedidos(pedidos);
    const ids = vinculos.map((vinculo) => vinculo.transformadorId);

    const [vigentes, ultimasPassagens, checkpoints] = await Promise.all([
      this.conferenciaRepository.findUltimaPorTransformadores(ids),
      this.passagemRepository.findUltimaPorTransformadores(ids),
      this.checkpointRepository.findAll(),
    ]);

    const ordemMaxima = checkpoints.reduce(
      (maior, checkpoint) => Math.max(maior, checkpoint.ordem),
      0,
    );

    const resumos = resumirLotes(
      vinculos,
      vigentes,
      ultimasPassagens,
      ordemMaxima,
    );

    return pedidos.map((pedido) => ({
      pedido,
      // O pedido veio do GROUP BY sobre as mesmas linhas dos vinculos, entao
      // o resumo sempre existe; o fallback e so o tipo fechando sem `!`.
      totalPecas: resumos.get(pedido)?.totalPecas ?? 0,
      pecasDivergentes: resumos.get(pedido)?.pecasDivergentes ?? 0,
      cliente: resumos.get(pedido)?.cliente ?? null,
      projetoCodigo: resumos.get(pedido)?.projetoCodigo ?? null,
      progressoPct: resumos.get(pedido)?.progressoPct ?? 0,
    }));
  }
}
