import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { CameraRepository } from './infrastructure/persistence/camera.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Camera } from './domain/camera';

@Injectable()
export class CamerasService {
  constructor(
    private readonly checkpointService: CheckpointsService,

    // Dependencies here
    private readonly cameraRepository: CameraRepository,
  ) {}

  async create(createCameraDto: CreateCameraDto) {
    // Do not remove comment below.
    // <creating-property />
    let checkpoint: Checkpoint | null | undefined = undefined;

    if (createCameraDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        createCameraDto.checkpoint.id,
      );
      if (!checkpointObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            checkpoint: 'notExists',
          },
        });
      }
      checkpoint = checkpointObject;
    } else if (createCameraDto.checkpoint === null) {
      checkpoint = null;
    }

    return this.cameraRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      checkpoint,

      endpoint: createCameraDto.endpoint,

      ativa: createCameraDto.ativa,

      fonteFisica: createCameraDto.fonteFisica,

      nome: createCameraDto.nome,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.cameraRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Camera['id']) {
    return this.cameraRepository.findById(id);
  }

  findByIds(ids: Camera['id'][]) {
    return this.cameraRepository.findByIds(ids);
  }

  async update(
    id: Camera['id'],

    updateCameraDto: UpdateCameraDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let checkpoint: Checkpoint | null | undefined = undefined;

    if (updateCameraDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        updateCameraDto.checkpoint.id,
      );
      if (!checkpointObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            checkpoint: 'notExists',
          },
        });
      }
      checkpoint = checkpointObject;
    } else if (updateCameraDto.checkpoint === null) {
      checkpoint = null;
    }

    return this.cameraRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      checkpoint,

      endpoint: updateCameraDto.endpoint,

      ativa: updateCameraDto.ativa,

      fonteFisica: updateCameraDto.fonteFisica,

      nome: updateCameraDto.nome,
    });
  }

  remove(id: Camera['id']) {
    return this.cameraRepository.remove(id);
  }
}
