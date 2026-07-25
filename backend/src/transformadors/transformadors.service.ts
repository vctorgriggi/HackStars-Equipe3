import { ProjetoModelosService } from '../projeto-modelos/projeto-modelos.service';
import { ProjetoModelo } from '../projeto-modelos/domain/projeto-modelo';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateTransformadorDto } from './dto/create-transformador.dto';
import { UpdateTransformadorDto } from './dto/update-transformador.dto';
import { TransformadorRepository } from './infrastructure/persistence/transformador.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Transformador } from './domain/transformador';

@Injectable()
export class TransformadorsService {
  constructor(
    private readonly projetoModeloService: ProjetoModelosService,

    // Dependencies here
    private readonly transformadorRepository: TransformadorRepository,
  ) {}

  async create(createTransformadorDto: CreateTransformadorDto) {
    // Do not remove comment below.
    // <creating-property />
    let projetoModelo: ProjetoModelo | null | undefined = undefined;

    if (createTransformadorDto.projetoModelo) {
      const projetoModeloObject = await this.projetoModeloService.findById(
        createTransformadorDto.projetoModelo.id,
      );
      if (!projetoModeloObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            projetoModelo: 'notExists',
          },
        });
      }
      projetoModelo = projetoModeloObject;
    } else if (createTransformadorDto.projetoModelo === null) {
      projetoModelo = null;
    }

    return this.transformadorRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      projetoModelo,

      descricao: createTransformadorDto.descricao,

      cliente: createTransformadorDto.cliente,

      seq: createTransformadorDto.seq,

      pedido: createTransformadorDto.pedido,

      patrimonio: createTransformadorDto.patrimonio,

      numeroSerie: createTransformadorDto.numeroSerie,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.transformadorRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Transformador['id']) {
    return this.transformadorRepository.findById(id);
  }

  findByIds(ids: Transformador['id'][]) {
    return this.transformadorRepository.findByIds(ids);
  }

  // Chave de negocio da peca: usada pelo find-or-create da execucao de
  // conferencia (o QR traz numero de serie, nunca o id interno).
  findByNumeroSerie(numeroSerie: Transformador['numeroSerie']) {
    return this.transformadorRepository.findByNumeroSerie(numeroSerie);
  }

  async update(
    id: Transformador['id'],

    updateTransformadorDto: UpdateTransformadorDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let projetoModelo: ProjetoModelo | null | undefined = undefined;

    if (updateTransformadorDto.projetoModelo) {
      const projetoModeloObject = await this.projetoModeloService.findById(
        updateTransformadorDto.projetoModelo.id,
      );
      if (!projetoModeloObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            projetoModelo: 'notExists',
          },
        });
      }
      projetoModelo = projetoModeloObject;
    } else if (updateTransformadorDto.projetoModelo === null) {
      projetoModelo = null;
    }

    return this.transformadorRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      projetoModelo,

      descricao: updateTransformadorDto.descricao,

      cliente: updateTransformadorDto.cliente,

      seq: updateTransformadorDto.seq,

      pedido: updateTransformadorDto.pedido,

      patrimonio: updateTransformadorDto.patrimonio,

      numeroSerie: updateTransformadorDto.numeroSerie,
    });
  }

  remove(id: Transformador['id']) {
    return this.transformadorRepository.remove(id);
  }
}
