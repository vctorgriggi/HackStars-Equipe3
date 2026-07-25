import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EventoPassagem } from '../../domain/evento-passagem';

export abstract class EventoPassagemRepository {
  abstract create(
    data: Omit<EventoPassagem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EventoPassagem>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<EventoPassagem[]>;

  abstract findById(
    id: EventoPassagem['id'],
  ): Promise<NullableType<EventoPassagem>>;

  abstract findByIds(ids: EventoPassagem['id'][]): Promise<EventoPassagem[]>;

  abstract update(
    id: EventoPassagem['id'],
    payload: DeepPartial<EventoPassagem>,
  ): Promise<EventoPassagem | null>;

  abstract remove(id: EventoPassagem['id']): Promise<void>;
}
