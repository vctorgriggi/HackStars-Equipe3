import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CampoConferidoEntity } from '../entities/campo-conferido.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CampoConferido } from '../../../../domain/campo-conferido';
import { CampoConferidoRepository } from '../../campo-conferido.repository';
import { CampoConferidoMapper } from '../mappers/campo-conferido.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CampoConferidoRelationalRepository implements CampoConferidoRepository {
  constructor(
    @InjectRepository(CampoConferidoEntity)
    private readonly campoConferidoRepository: Repository<CampoConferidoEntity>,
  ) {}

  async create(data: CampoConferido): Promise<CampoConferido> {
    const persistenceModel = CampoConferidoMapper.toPersistence(data);
    const newEntity = await this.campoConferidoRepository.save(
      this.campoConferidoRepository.create(persistenceModel),
    );
    return CampoConferidoMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CampoConferido[]> {
    const entities = await this.campoConferidoRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CampoConferidoMapper.toDomain(entity));
  }

  async findByConferencia({
    conferenciaId,
  }: {
    conferenciaId: string;
  }): Promise<CampoConferido[]> {
    const entities = await this.campoConferidoRepository.find({
      where: { conferencia: { id: conferenciaId } },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    return entities.map((entity) => CampoConferidoMapper.toDomain(entity));
  }

  async findById(
    id: CampoConferido['id'],
  ): Promise<NullableType<CampoConferido>> {
    const entity = await this.campoConferidoRepository.findOne({
      where: { id },
    });

    return entity ? CampoConferidoMapper.toDomain(entity) : null;
  }

  async findByIds(ids: CampoConferido['id'][]): Promise<CampoConferido[]> {
    const entities = await this.campoConferidoRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CampoConferidoMapper.toDomain(entity));
  }

  async update(
    id: CampoConferido['id'],
    payload: Partial<CampoConferido>,
  ): Promise<CampoConferido> {
    const entity = await this.campoConferidoRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.campoConferidoRepository.save(
      this.campoConferidoRepository.create(
        CampoConferidoMapper.toPersistence({
          ...CampoConferidoMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CampoConferidoMapper.toDomain(updatedEntity);
  }

  async remove(id: CampoConferido['id']): Promise<void> {
    await this.campoConferidoRepository.delete(id);
  }
}
