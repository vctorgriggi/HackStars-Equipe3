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
import { UploadFotoEvidenciaDto } from './dto/upload-foto-evidencia.dto';
import { UploadFotoEvidenciaResponseDto } from './dto/upload-foto-evidencia-response.dto';
import { EvidenciaUploader } from './infrastructure/uploader/evidencia-uploader';
import { FonteFisicaEnum } from './fonte-fisica.enum';

@Injectable()
export class FotoEvidenciaService {
  constructor(
    private readonly conferenciaService: ConferenciaService,

    private readonly evidenciaUploader: EvidenciaUploader,

    // Dependencies here
    private readonly fotoEvidenciaRepository: FotoEvidenciaRepository,
  ) {}

  // Upload da foto + registro da evidência em uma chamada: o arquivo vai pelo
  // uploader do boilerplate (driver do FILE_DRIVER) e a url persistida é a que
  // o próprio módulo de files devolve.
  async createFromUpload(
    file: Express.Multer.File,
    uploadFotoEvidenciaDto: UploadFotoEvidenciaDto,
  ): Promise<UploadFotoEvidenciaResponseDto> {
    // Conferência inexistente é 422 antes de gravar o arquivo.
    if (uploadFotoEvidenciaDto.conferenciaId) {
      const conferenciaObject = await this.conferenciaService.findById(
        uploadFotoEvidenciaDto.conferenciaId,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferenciaId: 'notExists',
          },
        });
      }
    }

    // Arquivo ausente é 422 ('selectFile') — mesma checagem do files.service.
    const uploaded = await this.evidenciaUploader.create(file);

    const fotoEvidencia = await this.create({
      url: uploaded.file.path,
      fonteFisica: uploadFotoEvidenciaDto.fonteFisica,
      conferencia: uploadFotoEvidenciaDto.conferenciaId
        ? { id: uploadFotoEvidenciaDto.conferenciaId }
        : null,
    });

    // Instância de classe (não objeto literal): o ClassSerializerInterceptor
    // só executa o @TransformUrlEvidencia (URL assinada no s3) em instâncias.
    return Object.assign(new UploadFotoEvidenciaResponseDto(), {
      id: fotoEvidencia.id,
      url: fotoEvidencia.url,
      fonteFisica: fotoEvidencia.fonteFisica as FonteFisicaEnum,
      conferenciaId: fotoEvidencia.conferencia?.id ?? null,
    });
  }

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
