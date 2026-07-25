import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Conferencia } from '../../domain/conferencia';

export abstract class ConferenciaRepository {
  abstract create(
    data: Omit<Conferencia, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Conferencia>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Conferencia[]>;

  abstract findById(id: Conferencia['id']): Promise<NullableType<Conferencia>>;

  abstract findByIds(ids: Conferencia['id'][]): Promise<Conferencia[]>;

  abstract update(
    id: Conferencia['id'],
    payload: DeepPartial<Conferencia>,
  ): Promise<Conferencia | null>;

  abstract remove(id: Conferencia['id']): Promise<void>;
}
