import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Transformador } from '../../domain/transformador';

/**
 * Filtros de listagem (gap 4 do CLAUDE.md: listagem so com paginacao global).
 * Casamento EXATO: `numeroSerie` e a chave de negocio (0 ou 1 resultado) e
 * `pedido` e o lote — o front do operador precisa dos dois para achar a peca
 * sem paginar o banco inteiro.
 */
export interface FiltroTransformador {
  numeroSerie?: string | null;
  pedido?: string | null;
}

export abstract class TransformadorRepository {
  abstract create(
    data: Omit<Transformador, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Transformador>;

  abstract findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: FiltroTransformador | null;
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
