import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CameraEntity } from '../entities/camera.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Camera } from '../../../../domain/camera';
import { CameraRepository } from '../../camera.repository';
import { CameraMapper } from '../mappers/camera.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CameraRelationalRepository implements CameraRepository {
  constructor(
    @InjectRepository(CameraEntity)
    private readonly cameraRepository: Repository<CameraEntity>,
  ) {}

  async create(data: Camera): Promise<Camera> {
    const persistenceModel = CameraMapper.toPersistence(data);
    const newEntity = await this.cameraRepository.save(
      this.cameraRepository.create(persistenceModel),
    );
    return CameraMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Camera[]> {
    const entities = await this.cameraRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CameraMapper.toDomain(entity));
  }

  async findById(id: Camera['id']): Promise<NullableType<Camera>> {
    const entity = await this.cameraRepository.findOne({
      where: { id },
    });

    return entity ? CameraMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Camera['id'][]): Promise<Camera[]> {
    const entities = await this.cameraRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CameraMapper.toDomain(entity));
  }

  async update(id: Camera['id'], payload: Partial<Camera>): Promise<Camera> {
    const entity = await this.cameraRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.cameraRepository.save(
      this.cameraRepository.create(
        CameraMapper.toPersistence({
          ...CameraMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CameraMapper.toDomain(updatedEntity);
  }

  async remove(id: Camera['id']): Promise<void> {
    await this.cameraRepository.delete(id);
  }
}
