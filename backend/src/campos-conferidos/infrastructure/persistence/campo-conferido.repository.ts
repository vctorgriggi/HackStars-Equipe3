import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CampoConferido } from '../../domain/campo-conferido';

export abstract class CampoConferidoRepository {
  abstract create(
    data: Omit<CampoConferido, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CampoConferido>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CampoConferido[]>;

  abstract findById(
    id: CampoConferido['id'],
  ): Promise<NullableType<CampoConferido>>;

  abstract findByIds(ids: CampoConferido['id'][]): Promise<CampoConferido[]>;

  abstract update(
    id: CampoConferido['id'],
    payload: DeepPartial<CampoConferido>,
  ): Promise<CampoConferido | null>;

  abstract remove(id: CampoConferido['id']): Promise<void>;
}
