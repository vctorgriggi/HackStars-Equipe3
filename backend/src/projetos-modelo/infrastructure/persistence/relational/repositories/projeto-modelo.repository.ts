import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProjetoModeloEntity } from '../entities/projeto-modelo.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ProjetoModelo } from '../../../../domain/projeto-modelo';
import { ProjetoModeloRepository } from '../../projeto-modelo.repository';
import { ProjetoModeloMapper } from '../mappers/projeto-modelo.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ProjetoModeloRelationalRepository implements ProjetoModeloRepository {
  constructor(
    @InjectRepository(ProjetoModeloEntity)
    private readonly projetoModeloRepository: Repository<ProjetoModeloEntity>,
  ) {}

  async create(data: ProjetoModelo): Promise<ProjetoModelo> {
    const persistenceModel = ProjetoModeloMapper.toPersistence(data);
    const newEntity = await this.projetoModeloRepository.save(
      this.projetoModeloRepository.create(persistenceModel),
    );
    return ProjetoModeloMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ProjetoModelo[]> {
    const entities = await this.projetoModeloRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ProjetoModeloMapper.toDomain(entity));
  }

  async findById(
    id: ProjetoModelo['id'],
  ): Promise<NullableType<ProjetoModelo>> {
    const entity = await this.projetoModeloRepository.findOne({
      where: { id },
    });

    return entity ? ProjetoModeloMapper.toDomain(entity) : null;
  }

  async findByIds(ids: ProjetoModelo['id'][]): Promise<ProjetoModelo[]> {
    const entities = await this.projetoModeloRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ProjetoModeloMapper.toDomain(entity));
  }

  async findByCodigo(
    codigo: ProjetoModelo['codigo'],
  ): Promise<NullableType<ProjetoModelo>> {
    const entity = await this.projetoModeloRepository.findOne({
      where: { codigo },
    });

    return entity ? ProjetoModeloMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<ProjetoModelo[]> {
    const entities = await this.projetoModeloRepository.find();

    return entities.map((entity) => ProjetoModeloMapper.toDomain(entity));
  }

  async update(
    id: ProjetoModelo['id'],
    payload: Partial<ProjetoModelo>,
  ): Promise<ProjetoModelo> {
    const entity = await this.projetoModeloRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.projetoModeloRepository.save(
      this.projetoModeloRepository.create(
        ProjetoModeloMapper.toPersistence({
          ...ProjetoModeloMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ProjetoModeloMapper.toDomain(updatedEntity);
  }

  async remove(id: ProjetoModelo['id']): Promise<void> {
    await this.projetoModeloRepository.delete(id);
  }
}
