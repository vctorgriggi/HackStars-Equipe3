import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TransformadorEntity } from '../entities/transformador.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Transformador } from '../../../../domain/transformador';
import { TransformadorRepository } from '../../transformador.repository';
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
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Transformador[]> {
    const entities = await this.transformadorRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
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
