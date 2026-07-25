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
    // Etapas reais da linha TRAEL, em ordem (SPEC.md, entidade Checkpoint).
    // Upsert por codigo (unique): idempotente por linha — repõe etapa apagada
    // e aplica etapas novas mesmo em banco já semeado.
    const etapas = [
      {
        codigo: 'adesivacao',
        nome: 'Adesivação/Separação da etiqueta',
        ordem: 1,
      },
      { codigo: 'serigrafia', nome: 'Serigrafia', ordem: 2 },
      {
        codigo: 'oleo-conferencia',
        nome: 'Enchimento de óleo e conferência',
        ordem: 3,
      },
      {
        codigo: 'fixacao-placa',
        nome: 'Fixação da placa de identificação',
        ordem: 4,
      },
    ];
    for (const etapa of etapas) {
      const existente = await this.repository.findOne({
        where: { codigo: etapa.codigo },
      });
      if (existente) {
        await this.repository.update(existente.id, etapa);
      } else {
        await this.repository.save(this.repository.create(etapa));
      }
    }
  }
}
