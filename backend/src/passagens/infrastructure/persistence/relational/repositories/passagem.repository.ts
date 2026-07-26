import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PassagemEntity } from '../entities/passagem.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Passagem } from '../../../../domain/passagem';
import { PassagemRepository } from '../../passagem.repository';
import { PassagemMapper } from '../mappers/passagem.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PassagemRelationalRepository implements PassagemRepository {
  constructor(
    @InjectRepository(PassagemEntity)
    private readonly passagemRepository: Repository<PassagemEntity>,
  ) {}

  async create(data: Passagem): Promise<Passagem> {
    const persistenceModel = PassagemMapper.toPersistence(data);
    const newEntity = await this.passagemRepository.save(
      this.passagemRepository.create(persistenceModel),
    );
    return PassagemMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Passagem[]> {
    const entities = await this.passagemRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => PassagemMapper.toDomain(entity));
  }

  async findAllByTransformador({
    transformadorId,
    paginationOptions,
  }: {
    transformadorId: string;
    paginationOptions: IPaginationOptions;
  }): Promise<Passagem[]> {
    const entities = await this.passagemRepository.find({
      where: { transformador: { id: transformadorId } },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    return entities.map((entity) => PassagemMapper.toDomain(entity));
  }

  async findById(id: Passagem['id']): Promise<NullableType<Passagem>> {
    const entity = await this.passagemRepository.findOne({
      where: { id },
    });

    return entity ? PassagemMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Passagem['id'][]): Promise<Passagem[]> {
    const entities = await this.passagemRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => PassagemMapper.toDomain(entity));
  }

  async update(
    id: Passagem['id'],
    payload: Partial<Passagem>,
  ): Promise<Passagem> {
    const entity = await this.passagemRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.passagemRepository.save(
      this.passagemRepository.create(
        PassagemMapper.toPersistence({
          ...PassagemMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PassagemMapper.toDomain(updatedEntity);
  }

  async remove(id: Passagem['id']): Promise<void> {
    await this.passagemRepository.delete(id);
  }
}
