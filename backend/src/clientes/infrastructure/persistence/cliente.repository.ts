import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Cliente } from '../../domain/cliente';

export abstract class ClienteRepository {
  abstract create(
    data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Cliente>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Cliente[]>;

  abstract findById(id: Cliente['id']): Promise<NullableType<Cliente>>;

  abstract findByNome(nome: Cliente['nome']): Promise<NullableType<Cliente>>;

  abstract findByIds(ids: Cliente['id'][]): Promise<Cliente[]>;

  abstract update(
    id: Cliente['id'],
    payload: DeepPartial<Cliente>,
  ): Promise<Cliente | null>;

  abstract remove(id: Cliente['id']): Promise<void>;
}
