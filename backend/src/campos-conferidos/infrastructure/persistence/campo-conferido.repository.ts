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

  /**
   * Campos de UMA conferencia, em ordem estavel (createdAt ASC, id como
   * desempate) — a ordem em que a execucao os gravou, que e a da checklist.
   *
   * Existe porque a releitura do veredito (`GET /conferencias/:id/campos`) nao
   * tinha como chegar aos campos: `findAllWithPagination` pagina o banco
   * inteiro (gap 4 do CLAUDE.md) e o veredito campo a campo so existia na
   * resposta do POST. Sem filtro por conferencia, um refresh perdia a tela.
   *
   * Sem paginacao de proposito: o conjunto e limitado pela checklist do
   * ProjetoModelo (9 itens no modelo da demo), e paginar o veredito de UMA
   * conferencia esconderia campo divergente atras de uma segunda pagina.
   */
  abstract findByConferencia({
    conferenciaId,
  }: {
    conferenciaId: string;
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
