import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Passagem } from '../../domain/passagem';
import { Transformador } from '../../../transformadores/domain/transformador';

export abstract class PassagemRepository {
  abstract create(
    data: Omit<Passagem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Passagem>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Passagem[]>;

  /**
   * Historico de transito de UMA peca, em ordem CRONOLOGICA (createdAt ASC —
   * criterio 5 do SPEC). Scans repetidos no mesmo checkpoint sao eventos
   * distintos e continuam ordenados: `id` desempata para a pagina nunca sair
   * embaralhada quando dois eventos caem no mesmo instante.
   */
  abstract findAllByTransformador({
    transformadorId,
    paginationOptions,
  }: {
    transformadorId: Transformador['id'];
    paginationOptions: IPaginationOptions;
  }): Promise<Passagem[]>;

  abstract findById(id: Passagem['id']): Promise<NullableType<Passagem>>;

  abstract findByIds(ids: Passagem['id'][]): Promise<Passagem[]>;

  abstract update(
    id: Passagem['id'],
    payload: DeepPartial<Passagem>,
  ): Promise<Passagem | null>;

  abstract remove(id: Passagem['id']): Promise<void>;
}
