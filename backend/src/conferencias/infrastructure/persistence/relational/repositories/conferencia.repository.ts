import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConferenciaEntity } from '../entities/conferencia.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Conferencia } from '../../../../domain/conferencia';
import { ConferenciaRepository } from '../../conferencia.repository';
import { ConferenciaMapper } from '../mappers/conferencia.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ConferenciaRelationalRepository implements ConferenciaRepository {
  constructor(
    @InjectRepository(ConferenciaEntity)
    private readonly conferenciaRepository: Repository<ConferenciaEntity>,
  ) {}

  async create(data: Conferencia): Promise<Conferencia> {
    const persistenceModel = ConferenciaMapper.toPersistence(data);
    const newEntity = await this.conferenciaRepository.save(
      this.conferenciaRepository.create(persistenceModel),
    );
    return ConferenciaMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Conferencia[]> {
    const entities = await this.conferenciaRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ConferenciaMapper.toDomain(entity));
  }

  async findAllByTransformador({
    transformadorId,
    limit,
  }: {
    transformadorId: string;
    limit: number;
  }): Promise<Conferencia[]> {
    const entities = await this.conferenciaRepository.find({
      where: { transformador: { id: transformadorId } },
      take: limit,
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return entities.map((entity) => ConferenciaMapper.toDomain(entity));
  }

  async findUltimaPorTransformadores(
    transformadorIds: string[],
  ): Promise<Map<string, Conferencia>> {
    const vigentes = new Map<string, Conferencia>();
    if (transformadorIds.length === 0) {
      return vigentes;
    }

    // DISTINCT ON exige que a expressao seja o prefixo do ORDER BY: por peca,
    // vence a linha mais recente (createdAt DESC, id DESC desempata). O join
    // do transformador seleciona SO o id — o eager arrastaria peca + projeto
    // + checklist para cada linha (gap 3).
    const entities = await this.conferenciaRepository
      .createQueryBuilder('conferencia')
      .distinctOn(['transformador.id'])
      .leftJoinAndSelect('conferencia.checkpoint', 'checkpoint')
      .leftJoin('conferencia.transformador', 'transformador')
      .addSelect('transformador.id')
      .where('transformador.id IN (:...transformadorIds)', { transformadorIds })
      .orderBy('transformador.id', 'ASC')
      .addOrderBy('conferencia.createdAt', 'DESC')
      .addOrderBy('conferencia.id', 'DESC')
      .getMany();

    for (const entity of entities) {
      vigentes.set(entity.transformador.id, ConferenciaMapper.toDomain(entity));
    }
    return vigentes;
  }

  async findById(id: Conferencia['id']): Promise<NullableType<Conferencia>> {
    const entity = await this.conferenciaRepository.findOne({
      where: { id },
    });

    return entity ? ConferenciaMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Conferencia['id'][]): Promise<Conferencia[]> {
    const entities = await this.conferenciaRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ConferenciaMapper.toDomain(entity));
  }

  async update(
    id: Conferencia['id'],
    payload: Partial<Conferencia>,
  ): Promise<Conferencia> {
    const entity = await this.conferenciaRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.conferenciaRepository.save(
      this.conferenciaRepository.create(
        ConferenciaMapper.toPersistence({
          ...ConferenciaMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ConferenciaMapper.toDomain(updatedEntity);
  }

  async remove(id: Conferencia['id']): Promise<void> {
    await this.conferenciaRepository.delete(id);
  }
}
