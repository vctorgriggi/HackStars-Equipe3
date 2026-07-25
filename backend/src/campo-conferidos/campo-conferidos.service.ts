import { FotoEvidenciaService } from '../foto-evidencia/foto-evidencia.service';
import { FotoEvidencia } from '../foto-evidencia/domain/foto-evidencia';

import { ConferenciaService } from '../conferencia/conferencia.service';
import { Conferencia } from '../conferencia/domain/conferencia';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCampoConferidoDto } from './dto/create-campo-conferido.dto';
import { UpdateCampoConferidoDto } from './dto/update-campo-conferido.dto';
import { CampoConferidoRepository } from './infrastructure/persistence/campo-conferido.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CampoConferido } from './domain/campo-conferido';

@Injectable()
export class CampoConferidosService {
  constructor(
    private readonly fotoEvidenciaService: FotoEvidenciaService,

    private readonly conferenciaService: ConferenciaService,

    // Dependencies here
    private readonly campoConferidoRepository: CampoConferidoRepository,
  ) {}

  async create(createCampoConferidoDto: CreateCampoConferidoDto) {
    // Do not remove comment below.
    // <creating-property />

    let fotoEvidencia: FotoEvidencia | null | undefined = undefined;

    if (createCampoConferidoDto.fotoEvidencia) {
      const fotoEvidenciaObject = await this.fotoEvidenciaService.findById(
        createCampoConferidoDto.fotoEvidencia.id,
      );
      if (!fotoEvidenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            fotoEvidencia: 'notExists',
          },
        });
      }
      fotoEvidencia = fotoEvidenciaObject;
    } else if (createCampoConferidoDto.fotoEvidencia === null) {
      fotoEvidencia = null;
    }

    const conferenciaObject = await this.conferenciaService.findById(
      createCampoConferidoDto.conferencia.id,
    );
    if (!conferenciaObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          conferencia: 'notExists',
        },
      });
    }
    const conferencia = conferenciaObject;

    return this.campoConferidoRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      regiaoLeitura: createCampoConferidoDto.regiaoLeitura,

      fotoEvidencia,

      // veredito nunca vem do DTO: so a engine grava (regra de ouro).

      confianca: createCampoConferidoDto.confianca,

      valorLido: createCampoConferidoDto.valorLido,

      valorEsperado: createCampoConferidoDto.valorEsperado,

      nomeCampo: createCampoConferidoDto.nomeCampo,

      conferencia,
    });
  }

  /**
   * Unico caminho que grava `veredito`: chamado server-side pela execucao de
   * conferencia, com o resultado ja calculado pela engine. Nao existe rota
   * nem DTO HTTP equivalente — veredito nunca entra pela borda (regra de ouro).
   *
   * `fotoEvidenciaId` inexistente no banco nao derruba a conferencia: o campo
   * e persistido sem foto (a evidencia e complementar ao veredito).
   */
  async criarComVeredito(dados: {
    conferencia: Conferencia;
    nomeCampo: string;
    valorEsperado: string;
    valorLido?: string | null;
    confianca?: number | null;
    veredito: string;
    regiaoLeitura?: string | null;
    fotoEvidenciaId?: string | null;
  }): Promise<CampoConferido> {
    let fotoEvidencia: FotoEvidencia | null = null;

    if (dados.fotoEvidenciaId) {
      fotoEvidencia = await this.fotoEvidenciaService.findById(
        dados.fotoEvidenciaId,
      );
    }

    return this.campoConferidoRepository.create({
      regiaoLeitura: dados.regiaoLeitura ?? null,

      fotoEvidencia,

      veredito: dados.veredito,

      confianca: dados.confianca ?? null,

      valorLido: dados.valorLido ?? null,

      valorEsperado: dados.valorEsperado,

      nomeCampo: dados.nomeCampo,

      conferencia: dados.conferencia,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.campoConferidoRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CampoConferido['id']) {
    return this.campoConferidoRepository.findById(id);
  }

  findByIds(ids: CampoConferido['id'][]) {
    return this.campoConferidoRepository.findByIds(ids);
  }

  async update(
    id: CampoConferido['id'],

    updateCampoConferidoDto: UpdateCampoConferidoDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let fotoEvidencia: FotoEvidencia | null | undefined = undefined;

    if (updateCampoConferidoDto.fotoEvidencia) {
      const fotoEvidenciaObject = await this.fotoEvidenciaService.findById(
        updateCampoConferidoDto.fotoEvidencia.id,
      );
      if (!fotoEvidenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            fotoEvidencia: 'notExists',
          },
        });
      }
      fotoEvidencia = fotoEvidenciaObject;
    } else if (updateCampoConferidoDto.fotoEvidencia === null) {
      fotoEvidencia = null;
    }

    let conferencia: Conferencia | undefined = undefined;

    if (updateCampoConferidoDto.conferencia) {
      const conferenciaObject = await this.conferenciaService.findById(
        updateCampoConferidoDto.conferencia.id,
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
    }

    return this.campoConferidoRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      regiaoLeitura: updateCampoConferidoDto.regiaoLeitura,

      fotoEvidencia,

      // veredito nunca vem do DTO: so a engine grava (regra de ouro).

      confianca: updateCampoConferidoDto.confianca,

      valorLido: updateCampoConferidoDto.valorLido,

      valorEsperado: updateCampoConferidoDto.valorEsperado,

      nomeCampo: updateCampoConferidoDto.nomeCampo,

      conferencia,
    });
  }

  remove(id: CampoConferido['id']) {
    return this.campoConferidoRepository.remove(id);
  }
}
