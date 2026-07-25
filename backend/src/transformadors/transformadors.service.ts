import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateTransformadorDto } from './dto/create-transformador.dto';
import { UpdateTransformadorDto } from './dto/update-transformador.dto';
import { TransformadorRepository } from './infrastructure/persistence/transformador.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Transformador } from './domain/transformador';

@Injectable()
export class TransformadorsService {
  constructor(
    // Dependencies here
    private readonly transformadorRepository: TransformadorRepository,
  ) {}

  async create(createTransformadorDto: CreateTransformadorDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.transformadorRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
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

  async update(
    id: Transformador['id'],

    updateTransformadorDto: UpdateTransformadorDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.transformadorRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
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
