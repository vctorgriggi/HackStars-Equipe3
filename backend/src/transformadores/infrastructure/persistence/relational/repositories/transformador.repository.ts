import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { TransformadorEntity } from '../entities/transformador.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Transformador } from '../../../../domain/transformador';
import {
  FiltroTransformador,
  TransformadorRepository,
  VinculoClienteTransformador,
} from '../../transformador.repository';
import { TransformadorMapper } from '../mappers/transformador.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class TransformadorRelationalRepository implements TransformadorRepository {
  constructor(
    @InjectRepository(TransformadorEntity)
    private readonly transformadorRepository: Repository<TransformadorEntity>,
  ) {}

  async create(data: Transformador): Promise<Transformador> {
    const persistenceModel = TransformadorMapper.toPersistence(data);
    const newEntity = await this.transformadorRepository.save(
      this.transformadorRepository.create(persistenceModel),
    );
    return TransformadorMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: FiltroTransformador | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Transformador[]> {
    const where: FindOptionsWhere<TransformadorEntity> = {};
    if (filterOptions?.numeroSerie) {
      where.numeroSerie = filterOptions.numeroSerie;
    }
    if (filterOptions?.pedido) {
      where.pedido = filterOptions.pedido;
    }

    const entities = await this.transformadorRepository.find({
      where,
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      // Ordem estavel: sem ela o Postgres pode devolver paginas repetidas.
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    return entities.map((entity) => TransformadorMapper.toDomain(entity));
  }

  async findById(
    id: Transformador['id'],
  ): Promise<NullableType<Transformador>> {
    const entity = await this.transformadorRepository.findOne({
      where: { id },
    });

    return entity ? TransformadorMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Transformador['id'][]): Promise<Transformador[]> {
    const entities = await this.transformadorRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => TransformadorMapper.toDomain(entity));
  }

  async findByNumeroSerie(
    numeroSerie: Transformador['numeroSerie'],
  ): Promise<NullableType<Transformador>> {
    const entity = await this.transformadorRepository.findOne({
      where: { numeroSerie },
    });

    return entity ? TransformadorMapper.toDomain(entity) : null;
  }

  async findVinculosPorClientes(
    clienteIds: string[],
  ): Promise<VinculoClienteTransformador[]> {
    if (clienteIds.length === 0) {
      return [];
    }

    // getRawMany de proposito: so os dois ids atravessam o fio — hidratar a
    // entity dispararia o eager de cliente e projeto (checklist inteira) para
    // cada peca da pagina (gap 3).
    return this.transformadorRepository
      .createQueryBuilder('transformador')
      .select('transformador.id', 'transformadorId')
      .addSelect('cliente.id', 'clienteId')
      .innerJoin('transformador.clienteVinculado', 'cliente')
      .where('cliente.id IN (:...clienteIds)', { clienteIds })
      .getRawMany<VinculoClienteTransformador>();
  }

  async contarPorProjetos(projetoIds: string[]): Promise<Map<string, number>> {
    if (projetoIds.length === 0) {
      return new Map();
    }

    const linhas = await this.transformadorRepository
      .createQueryBuilder('transformador')
      .select('projeto.id', 'projetoId')
      .addSelect('COUNT(*)', 'total')
      .innerJoin('transformador.projetoModelo', 'projeto')
      .where('projeto.id IN (:...projetoIds)', { projetoIds })
      .groupBy('projeto.id')
      .getRawMany<{ projetoId: string; total: string }>();

    // COUNT chega como string do driver pg.
    return new Map(linhas.map((l) => [l.projetoId, Number(l.total)]));
  }

  async update(
    id: Transformador['id'],
    payload: Partial<Transformador>,
  ): Promise<Transformador> {
    const entity = await this.transformadorRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.transformadorRepository.save(
      this.transformadorRepository.create(
        TransformadorMapper.toPersistence({
          ...TransformadorMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return TransformadorMapper.toDomain(updatedEntity);
  }

  async remove(id: Transformador['id']): Promise<void> {
    await this.transformadorRepository.delete(id);
  }
}
