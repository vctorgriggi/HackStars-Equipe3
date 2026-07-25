import { ConferenciaService } from '../conferencia/conferencia.service';
import { Conferencia } from '../conferencia/domain/conferencia';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateFotoEvidenciaDto } from './dto/create-foto-evidencia.dto';
import { UpdateFotoEvidenciaDto } from './dto/update-foto-evidencia.dto';
import { FotoEvidenciaRepository } from './infrastructure/persistence/foto-evidencia.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FotoEvidencia } from './domain/foto-evidencia';

@Injectable()
export class FotoEvidenciaService {
  constructor(
    private readonly conferenciaService: ConferenciaService,

    // Dependencies here
    private readonly fotoEvidenciaRepository: FotoEvidenciaRepository,
  ) {}

  async create(createFotoEvidenciaDto: CreateFotoEvidenciaDto) {
    // Do not remove comment below.
    // <creating-property />
    let conferencia: Conferencia | null | undefined = undefined;

    if (createFotoEvidenciaDto.conferencia) {
      const conferenciaObject = await this.conferenciaService.findById(
        createFotoEvidenciaDto.conferencia.id,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferencia: 'notExists',
          },
        });
      }
      conferencia = conferenciaObject;
    } else if (createFotoEvidenciaDto.conferencia === null) {
      conferencia = null;
    }

    return this.fotoEvidenciaRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      conferencia,

      fonteFisica: createFotoEvidenciaDto.fonteFisica,

      url: createFotoEvidenciaDto.url,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.fotoEvidenciaRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: FotoEvidencia['id']) {
    return this.fotoEvidenciaRepository.findById(id);
  }

  findByIds(ids: FotoEvidencia['id'][]) {
    return this.fotoEvidenciaRepository.findByIds(ids);
  }

  async update(
    id: FotoEvidencia['id'],

    updateFotoEvidenciaDto: UpdateFotoEvidenciaDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let conferencia: Conferencia | null | undefined = undefined;

    if (updateFotoEvidenciaDto.conferencia) {
      const conferenciaObject = await this.conferenciaService.findById(
        updateFotoEvidenciaDto.conferencia.id,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferencia: 'notExists',
          },
        });
      }
      conferencia = conferenciaObject;
    } else if (updateFotoEvidenciaDto.conferencia === null) {
      conferencia = null;
    }

    return this.fotoEvidenciaRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      conferencia,

      fonteFisica: updateFotoEvidenciaDto.fonteFisica,

      url: updateFotoEvidenciaDto.url,
    });
  }

  remove(id: FotoEvidencia['id']) {
    return this.fotoEvidenciaRepository.remove(id);
  }
}
