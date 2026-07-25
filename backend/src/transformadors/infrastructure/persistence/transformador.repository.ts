import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Transformador } from '../../domain/transformador';

export abstract class TransformadorRepository {
  abstract create(
    data: Omit<Transformador, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Transformador>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Transformador[]>;

  abstract findById(
    id: Transformador['id'],
  ): Promise<NullableType<Transformador>>;

  abstract findByIds(ids: Transformador['id'][]): Promise<Transformador[]>;

  // numeroSerie e a chave de negocio (coluna UNIQUE): base do find-or-create.
  abstract findByNumeroSerie(
    numeroSerie: Transformador['numeroSerie'],
  ): Promise<NullableType<Transformador>>;

  abstract update(
    id: Transformador['id'],
    payload: DeepPartial<Transformador>,
  ): Promise<Transformador | null>;

  abstract remove(id: Transformador['id']): Promise<void>;
}
