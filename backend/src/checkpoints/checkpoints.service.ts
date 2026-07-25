import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { CheckpointRepository } from './infrastructure/persistence/checkpoint.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Checkpoint } from './domain/checkpoint';

@Injectable()
export class CheckpointsService {
  constructor(
    // Dependencies here
    private readonly checkpointRepository: CheckpointRepository,
  ) {}

  async create(createCheckpointDto: CreateCheckpointDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.checkpointRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      codigo: createCheckpointDto.codigo,

      ordem: createCheckpointDto.ordem,

      nome: createCheckpointDto.nome,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.checkpointRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Checkpoint['id']) {
    return this.checkpointRepository.findById(id);
  }

  findByIds(ids: Checkpoint['id'][]) {
    return this.checkpointRepository.findByIds(ids);
  }

  // Etapa informada pelo dispositivo chega como codigo (slug), nao como id.
  findByCodigo(codigo: Checkpoint['codigo']) {
    return this.checkpointRepository.findByCodigo(codigo);
  }

  async update(
    id: Checkpoint['id'],

    updateCheckpointDto: UpdateCheckpointDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.checkpointRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      codigo: updateCheckpointDto.codigo,

      ordem: updateCheckpointDto.ordem,

      nome: updateCheckpointDto.nome,
    });
  }

  remove(id: Checkpoint['id']) {
    return this.checkpointRepository.remove(id);
  }
}
