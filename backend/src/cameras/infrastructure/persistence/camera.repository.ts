import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Camera } from '../../domain/camera';

export abstract class CameraRepository {
  abstract create(
    data: Omit<Camera, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Camera>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Camera[]>;

  abstract findById(id: Camera['id']): Promise<NullableType<Camera>>;

  abstract findByIds(ids: Camera['id'][]): Promise<Camera[]>;

  abstract update(
    id: Camera['id'],
    payload: DeepPartial<Camera>,
  ): Promise<Camera | null>;

  abstract remove(id: Camera['id']): Promise<void>;
}
