import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FotoEvidenciaEntity } from '../entities/foto-evidencia.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { FotoEvidencia } from '../../../../domain/foto-evidencia';
import { FotoEvidenciaRepository } from '../../foto-evidencia.repository';
import { FotoEvidenciaMapper } from '../mappers/foto-evidencia.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class FotoEvidenciaRelationalRepository implements FotoEvidenciaRepository {
  constructor(
    @InjectRepository(FotoEvidenciaEntity)
    private readonly fotoEvidenciaRepository: Repository<FotoEvidenciaEntity>,
  ) {}

  async create(data: FotoEvidencia): Promise<FotoEvidencia> {
    const persistenceModel = FotoEvidenciaMapper.toPersistence(data);
    const newEntity = await this.fotoEvidenciaRepository.save(
      this.fotoEvidenciaRepository.create(persistenceModel),
    );
    return FotoEvidenciaMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FotoEvidencia[]> {
    const entities = await this.fotoEvidenciaRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FotoEvidenciaMapper.toDomain(entity));
  }

  async findById(
    id: FotoEvidencia['id'],
  ): Promise<NullableType<FotoEvidencia>> {
    const entity = await this.fotoEvidenciaRepository.findOne({
      where: { id },
    });

    return entity ? FotoEvidenciaMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FotoEvidencia['id'][]): Promise<FotoEvidencia[]> {
    const entities = await this.fotoEvidenciaRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => FotoEvidenciaMapper.toDomain(entity));
  }

  async update(
    id: FotoEvidencia['id'],
    payload: Partial<FotoEvidencia>,
  ): Promise<FotoEvidencia> {
    const entity = await this.fotoEvidenciaRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.fotoEvidenciaRepository.save(
      this.fotoEvidenciaRepository.create(
        FotoEvidenciaMapper.toPersistence({
          ...FotoEvidenciaMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return FotoEvidenciaMapper.toDomain(updatedEntity);
  }

  async remove(id: FotoEvidencia['id']): Promise<void> {
    await this.fotoEvidenciaRepository.delete(id);
  }
}
