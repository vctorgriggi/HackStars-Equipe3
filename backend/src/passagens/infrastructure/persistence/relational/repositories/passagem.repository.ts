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

  async findUltimaPorTransformadores(
    transformadorIds: string[],
  ): Promise<Map<string, Passagem>> {
    const ultimas = new Map<string, Passagem>();
    if (transformadorIds.length === 0) {
      return ultimas;
    }

    // Mesmo desenho da conferencia vigente: DISTINCT ON por peca com a linha
    // mais recente vencendo, e o transformador entra so pelo id (gap 3).
    const entities = await this.passagemRepository
      .createQueryBuilder('passagem')
      .distinctOn(['transformador.id'])
      .leftJoinAndSelect('passagem.checkpoint', 'checkpoint')
      .leftJoin('passagem.transformador', 'transformador')
      .addSelect('transformador.id')
      .where('transformador.id IN (:...transformadorIds)', { transformadorIds })
      .orderBy('transformador.id', 'ASC')
      .addOrderBy('passagem.createdAt', 'DESC')
      .addOrderBy('passagem.id', 'DESC')
      .getMany();

    for (const entity of entities) {
      ultimas.set(entity.transformador.id, PassagemMapper.toDomain(entity));
    }
    return ultimas;
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
