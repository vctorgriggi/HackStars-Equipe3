import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';

import { TransformadorsService } from '../transformadors/transformadors.service';
import { Transformador } from '../transformadors/domain/transformador';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateEventoPassagemDto } from './dto/create-evento-passagem.dto';
import { UpdateEventoPassagemDto } from './dto/update-evento-passagem.dto';
import { EventoPassagemRepository } from './infrastructure/persistence/evento-passagem.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { EventoPassagem } from './domain/evento-passagem';

@Injectable()
export class EventoPassagemsService {
  constructor(
    private readonly checkpointService: CheckpointsService,

    private readonly transformadorService: TransformadorsService,

    // Dependencies here
    private readonly eventoPassagemRepository: EventoPassagemRepository,
  ) {}

  async create(createEventoPassagemDto: CreateEventoPassagemDto) {
    // Do not remove comment below.
    // <creating-property />

    const checkpointObject = await this.checkpointService.findById(
      createEventoPassagemDto.checkpoint.id,
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
      createEventoPassagemDto.transformador.id,
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

    return this.eventoPassagemRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      observacao: createEventoPassagemDto.observacao,

      checkpoint,

      transformador,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.eventoPassagemRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: EventoPassagem['id']) {
    return this.eventoPassagemRepository.findById(id);
  }

  findByIds(ids: EventoPassagem['id'][]) {
    return this.eventoPassagemRepository.findByIds(ids);
  }

  async update(
    id: EventoPassagem['id'],

    updateEventoPassagemDto: UpdateEventoPassagemDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let checkpoint: Checkpoint | undefined = undefined;

    if (updateEventoPassagemDto.checkpoint) {
      const checkpointObject = await this.checkpointService.findById(
        updateEventoPassagemDto.checkpoint.id,
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

    if (updateEventoPassagemDto.transformador) {
      const transformadorObject = await this.transformadorService.findById(
        updateEventoPassagemDto.transformador.id,
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

    return this.eventoPassagemRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      observacao: updateEventoPassagemDto.observacao,

      checkpoint,

      transformador,
    });
  }

  remove(id: EventoPassagem['id']) {
    return this.eventoPassagemRepository.remove(id);
  }
}
