import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FotoEvidencia } from '../../domain/foto-evidencia';

export abstract class FotoEvidenciaRepository {
  abstract create(
    data: Omit<FotoEvidencia, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FotoEvidencia>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FotoEvidencia[]>;

  abstract findById(
    id: FotoEvidencia['id'],
  ): Promise<NullableType<FotoEvidencia>>;

  abstract findByIds(ids: FotoEvidencia['id'][]): Promise<FotoEvidencia[]>;

  abstract update(
    id: FotoEvidencia['id'],
    payload: DeepPartial<FotoEvidencia>,
  ): Promise<FotoEvidencia | null>;

  abstract remove(id: FotoEvidencia['id']): Promise<void>;
}
