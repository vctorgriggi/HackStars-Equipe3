import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Conferencia } from '../../domain/conferencia';
import { Transformador } from '../../../transformadores/domain/transformador';

export abstract class ConferenciaRepository {
  abstract create(
    data: Omit<Conferencia, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Conferencia>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Conferencia[]>;

  /**
   * Conferencias de UMA peca, da mais recente para a mais antiga (createdAt
   * DESC). `limit: 1` e o "ultimo veredito da peca" que o scan em checkpoint
   * exibe no ato (criterio 6 do SPEC) — leitura, nunca comparacao: o veredito
   * ja nasceu na engine.
   */
  abstract findAllByTransformador({
    transformadorId,
    limit,
  }: {
    transformadorId: Transformador['id'];
    limit: number;
  }): Promise<Conferencia[]>;

  /**
   * A conferencia MAIS RECENTE de cada peca do conjunto (o veredito vigente),
   * numa unica query (DISTINCT ON) — e o que a listagem com situacao consome
   * para nao pagar uma consulta por linha. Peca sem conferencia simplesmente
   * nao aparece no mapa: ausencia e estado legitimo, nunca veredito.
   */
  abstract findUltimaPorTransformadores(
    transformadorIds: Transformador['id'][],
  ): Promise<Map<Transformador['id'], Conferencia>>;

  abstract findById(id: Conferencia['id']): Promise<NullableType<Conferencia>>;

  abstract findByIds(ids: Conferencia['id'][]): Promise<Conferencia[]>;

  abstract update(
    id: Conferencia['id'],
    payload: DeepPartial<Conferencia>,
  ): Promise<Conferencia | null>;

  abstract remove(id: Conferencia['id']): Promise<void>;
}
