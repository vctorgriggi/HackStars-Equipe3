import { Injectable } from '@nestjs/common';

import { ConferenciaRepository } from '../../conferencias/infrastructure/persistence/conferencia.repository';
import { TransformadorRepository } from '../../transformadores/infrastructure/persistence/transformador.repository';
import { IPaginationOptions } from '../../utils/types/pagination-options';

import { ClienteRepository } from '../infrastructure/persistence/cliente.repository';
import { ClienteComContadores } from './cliente-com-contadores';
import { contarPorCliente } from './contadores';

/**
 * Listagem de clientes com contadores derivados no servidor (precedente:
 * `GET /transformadores` com situacao). Consome os repositorios de
 * transformador e conferencia direto porque sao portas de persistencia —
 * modulos folha, sem ciclo com `transformadores` (que importa ClientesModule).
 *
 * A vigencia reusa `ConferenciaRepository.findUltimaPorTransformadores` (o
 * DISTINCT ON unico do sistema) — nunca uma segunda resolucao independente.
 */
@Injectable()
export class ClientesConsultasService {
  constructor(
    private readonly clienteRepository: ClienteRepository,

    private readonly transformadorRepository: TransformadorRepository,

    private readonly conferenciaRepository: ConferenciaRepository,
  ) {}

  async listarComContadores({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ClienteComContadores[]> {
    const clientes = await this.clienteRepository.findAllWithPagination({
      paginationOptions,
    });

    const vinculos = await this.transformadorRepository.findVinculosPorClientes(
      clientes.map((cliente) => cliente.id),
    );
    const vigentes =
      await this.conferenciaRepository.findUltimaPorTransformadores(
        vinculos.map((vinculo) => vinculo.transformadorId),
      );
    const contadores = contarPorCliente(vinculos, vigentes);

    return clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      totalPecas: contadores.get(cliente.id)?.totalPecas ?? 0,
      pecasDivergentes: contadores.get(cliente.id)?.pecasDivergentes ?? 0,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
    }));
  }
}
