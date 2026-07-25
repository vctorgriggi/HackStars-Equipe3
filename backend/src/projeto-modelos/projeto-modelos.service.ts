import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateProjetoModeloDto } from './dto/create-projeto-modelo.dto';
import { UpdateProjetoModeloDto } from './dto/update-projeto-modelo.dto';
import { ProjetoModeloRepository } from './infrastructure/persistence/projeto-modelo.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ProjetoModelo } from './domain/projeto-modelo';

@Injectable()
export class ProjetoModelosService {
  constructor(
    // Dependencies here
    private readonly projetoModeloRepository: ProjetoModeloRepository,
  ) {}

  async create(createProjetoModeloDto: CreateProjetoModeloDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.projetoModeloRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      checklist: createProjetoModeloDto.checklist,

      descricao: createProjetoModeloDto.descricao,

      codigo: createProjetoModeloDto.codigo,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.projetoModeloRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: ProjetoModelo['id']) {
    return this.projetoModeloRepository.findById(id);
  }

  findByIds(ids: ProjetoModelo['id'][]) {
    return this.projetoModeloRepository.findByIds(ids);
  }

  async update(
    id: ProjetoModelo['id'],

    updateProjetoModeloDto: UpdateProjetoModeloDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.projetoModeloRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      checklist: updateProjetoModeloDto.checklist,

      descricao: updateProjetoModeloDto.descricao,

      codigo: updateProjetoModeloDto.codigo,
    });
  }

  remove(id: ProjetoModelo['id']) {
    return this.projetoModeloRepository.remove(id);
  }
}
