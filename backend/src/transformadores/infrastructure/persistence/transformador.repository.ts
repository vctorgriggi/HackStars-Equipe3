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

/**
 * Par (peca, cliente) enxuto para os contadores da tela de clientes: o
 * `clienteVinculado` e `@Exclude` na serializacao do dominio, entao quem
 * precisa do vinculo consulta por id aqui — nunca pelo objeto serializado.
 */
export interface VinculoClienteTransformador {
  transformadorId: string;
  clienteId: string;
}

/**
 * Linha enxuta (peca, pedido) para o resumo de lotes: lote NAO e entidade —
 * e o recorte das pecas pelo `pedido` do QR. `cliente` e o texto da
 * identidade e `projetoCodigo` vem do vinculo (null sem projeto).
 */
export interface VinculoLoteTransformador {
  transformadorId: string;
  pedido: string;
  cliente: string;
  projetoCodigo: string | null;
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

  // Vinculos peca ↔ cliente dos clientes pedidos, SO ids (as relacoes geradas
  // sao eager — gap 3; uma pagina de clientes nao pode arrastar checklist).
  abstract findVinculosPorClientes(
    clienteIds: string[],
  ): Promise<VinculoClienteTransformador[]>;

  // Contagem de pecas por ProjetoModelo (GROUP BY no banco, nunca uma query
  // por projeto) para os contadores da tela de projetos.
  abstract contarPorProjetos(
    projetoIds: string[],
  ): Promise<Map<string, number>>;

  // Pagina de PEDIDOS distintos (GROUP BY pedido, mais recente primeiro) —
  // a "listagem de lotes" e isto; pedido vazio/nulo nao forma lote.
  abstract findPedidosPaginados({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<string[]>;

  // Linhas (peca, pedido, cliente, projetoCodigo) dos pedidos da pagina, so
  // colunas — hidratar a entity arrastaria o eager (checklist) por peca.
  abstract findVinculosPorPedidos(
    pedidos: string[],
  ): Promise<VinculoLoteTransformador[]>;

  abstract update(
    id: Transformador['id'],
    payload: DeepPartial<Transformador>,
  ): Promise<Transformador | null>;

  abstract remove(id: Transformador['id']): Promise<void>;
}
