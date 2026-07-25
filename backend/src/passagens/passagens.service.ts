import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';

import { TransformadoresService } from '../transformadores/transformadores.service';
import { Transformador } from '../transformadores/domain/transformador';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreatePassagemDto } from './dto/create-passagem.dto';
import { UpdatePassagemDto } from './dto/update-passagem.dto';
import { PassagemRepository } from './infrastructure/persistence/passagem.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Passagem } from './domain/passagem';

@Injectable()
export class PassagensService {
  constructor(
    private readonly checkpointService: CheckpointsService,

    private readonly transformadorService: TransformadoresService,

    // Dependencies here
    private readonly passagemRepository: PassagemRepository,
  ) {}

  async create(createPassagemDto: CreatePassagemDto) {
    // Do not remove comment below.
    // <creating-property />

    const checkpointObject = await this.checkpointService.findById(
      createPassagemDto.checkpoint.id,
    );
    if (!checkpointObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          checkpoint: 'notExists',
        },
      });
    }
    const checkpoint = checkpointObject;

    const transformadorObject = await this.transformadorService.findById(
      createPassagemDto.transformador.id,
    );
    if (!transformadorObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          transformador: 'notExists',
        },
      });
    }
    const transformador = transformadorObject;

    return this.passagemRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      observacao: createPassagemDto.observacao,

      checkpoint,

      transformador,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.passagemRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Passagem['id']) {
    return this.passagemRepository.findById(id);
  }

  findByIds(ids: Passagem['id'][]) {
    return this.passagemRepository.findByIds(ids);
  }

  async update(
    id: Passagem['id'],

    updatePassagemDto: UpdatePassagemDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let checkpoint: Checkpoint | undefined = undefined;

    if (updatePassagemDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        updatePassagemDto.checkpoint.id,
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
    }

    let transformador: Transformador | undefined = undefined;

    if (updatePassagemDto.transformador) {
      const transformadorObject = await this.transformadorService.findById(
        updatePassagemDto.transformador.id,
      );
      if (!transformadorObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            transformador: 'notExists',
          },
        });
      }
      transformador = transformadorObject;
    }

    return this.passagemRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      observacao: updatePassagemDto.observacao,

      checkpoint,

      transformador,
    });
  }

  remove(id: Passagem['id']) {
    return this.passagemRepository.remove(id);
  }
}
