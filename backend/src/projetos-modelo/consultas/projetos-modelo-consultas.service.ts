import { Injectable } from '@nestjs/common';

import { TransformadorRepository } from '../../transformadores/infrastructure/persistence/transformador.repository';
import { IPaginationOptions } from '../../utils/types/pagination-options';

import { ProjetoModeloRepository } from '../infrastructure/persistence/projeto-modelo.repository';
import { ProjetoModeloComContadores } from './projeto-modelo-com-contadores';
import { resumirChecklist } from './resumo-checklist';

/**
 * Listagem de projetos com contadores derivados no servidor (precedente:
 * `GET /transformadores` com situacao). Consome o repositorio de
 * transformador direto — modulo folha de persistencia, sem ciclo.
 */
@Injectable()
export class ProjetosModeloConsultasService {
  constructor(
    private readonly projetoModeloRepository: ProjetoModeloRepository,

    private readonly transformadorRepository: TransformadorRepository,
  ) {}

  async listarComContadores({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ProjetoModeloComContadores[]> {
    const projetos = await this.projetoModeloRepository.findAllWithPagination({
      paginationOptions,
    });

    const pecasPorProjeto =
      await this.transformadorRepository.contarPorProjetos(
        projetos.map((projeto) => projeto.id),
      );

    return projetos.map((projeto) => {
      const resumo = resumirChecklist(projeto.checklist);
      return {
        id: projeto.id,
        codigo: projeto.codigo,
        descricao: projeto.descricao ?? null,
        checklist: projeto.checklist,
        totalPecas: pecasPorProjeto.get(projeto.id) ?? 0,
        totalCampos: resumo.totalCampos,
        camposPorEtapa: resumo.camposPorEtapa,
        createdAt: projeto.createdAt,
        updatedAt: projeto.updatedAt,
      };
    });
  }
}
