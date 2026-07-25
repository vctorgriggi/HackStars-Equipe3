import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CheckpointEntity } from '../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CheckpointSeedService {
  constructor(
    @InjectRepository(CheckpointEntity)
    private repository: Repository<CheckpointEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (count === 0) {
      // Etapas reais da linha TRAEL, em ordem (SPEC.md, entidade Checkpoint)
      const etapas = [
        { nome: 'Adesivação/Separação da etiqueta', ordem: 1 },
        { nome: 'Serigrafia', ordem: 2 },
        { nome: 'Enchimento de óleo e conferência', ordem: 3 },
        { nome: 'Fixação da placa de identificação', ordem: 4 },
      ];
      await this.repository.save(
        etapas.map((etapa) => this.repository.create(etapa)),
      );
    }
  }
}
