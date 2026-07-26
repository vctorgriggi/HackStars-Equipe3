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
import { CreateConferenciaDto } from './dto/create-conferencia.dto';
import { UpdateConferenciaDto } from './dto/update-conferencia.dto';
import { ConferenciaRepository } from './infrastructure/persistence/conferencia.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Conferencia } from './domain/conferencia';

@Injectable()
export class ConferenciasService {
  constructor(
    private readonly checkpointService: CheckpointsService,

    private readonly transformadorService: TransformadoresService,

    // Dependencies here
    private readonly conferenciaRepository: ConferenciaRepository,
  ) {}

  async create(createConferenciaDto: CreateConferenciaDto) {
    // Do not remove comment below.
    // <creating-property />

    let checkpoint: Checkpoint | null | undefined = undefined;

    if (createConferenciaDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        createConferenciaDto.checkpoint.id,
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
    } else if (createConferenciaDto.checkpoint === null) {
      checkpoint = null;
    }

    const transformadorObject = await this.transformadorService.findById(
      createConferenciaDto.transformador.id,
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

    return this.conferenciaRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      observacao: createConferenciaDto.observacao,

      // vereditoGeral nunca vem do DTO: so a engine grava (regra de ouro).

      checkpoint,

      transformador,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.conferenciaRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Conferencia['id']) {
    return this.conferenciaRepository.findById(id);
  }

  findByIds(ids: Conferencia['id'][]) {
    return this.conferenciaRepository.findByIds(ids);
  }

  async update(
    id: Conferencia['id'],

    updateConferenciaDto: UpdateConferenciaDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let checkpoint: Checkpoint | null | undefined = undefined;

    if (updateConferenciaDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        updateConferenciaDto.checkpoint.id,
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
    } else if (updateConferenciaDto.checkpoint === null) {
      checkpoint = null;
    }

    let transformador: Transformador | undefined = undefined;

    if (updateConferenciaDto.transformador) {
      const transformadorObject = await this.transformadorService.findById(
        updateConferenciaDto.transformador.id,
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

    return this.conferenciaRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      observacao: updateConferenciaDto.observacao,

      // vereditoGeral nunca vem do DTO: so a engine grava (regra de ouro).

      checkpoint,

      transformador,
    });
  }

  remove(id: Conferencia['id']) {
    return this.conferenciaRepository.remove(id);
  }
}
