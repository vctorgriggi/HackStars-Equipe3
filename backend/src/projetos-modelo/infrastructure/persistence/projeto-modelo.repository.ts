import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { ProjetoModelo } from '../../domain/projeto-modelo';

export abstract class ProjetoModeloRepository {
  abstract create(
    data: Omit<ProjetoModelo, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProjetoModelo>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ProjetoModelo[]>;

  abstract findById(
    id: ProjetoModelo['id'],
  ): Promise<NullableType<ProjetoModelo>>;

  abstract findByIds(ids: ProjetoModelo['id'][]): Promise<ProjetoModelo[]>;

  // codigo do desenho (coluna UNIQUE): o QR da etiqueta referencia o projeto
  // por codigo.
  abstract findByCodigo(
    codigo: ProjetoModelo['codigo'],
  ): Promise<NullableType<ProjetoModelo>>;

  // Sem paginacao de proposito: usado para decidir se ha um unico projeto
  // cadastrado (fallback de resolucao na execucao de conferencia).
  abstract findAll(): Promise<ProjetoModelo[]>;

  abstract update(
    id: ProjetoModelo['id'],
    payload: DeepPartial<ProjetoModelo>,
  ): Promise<ProjetoModelo | null>;

  abstract remove(id: ProjetoModelo['id']): Promise<void>;
}
