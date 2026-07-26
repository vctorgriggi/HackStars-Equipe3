import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CameraEntity } from '../../../../cameras/infrastructure/persistence/relational/entities/camera.entity';
import { CheckpointEntity } from '../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CameraSeedService {
  constructor(
    @InjectRepository(CameraEntity)
    private repository: Repository<CameraEntity>,
    @InjectRepository(CheckpointEntity)
    private checkpointRepository: Repository<CheckpointEntity>,
  ) {}

  async run() {
    // Uma câmera por gate da linha, com a vista que o ponto de captura daquele
    // gate enxerga (SPEC, "Câmeras fixas na linha"). Upsert por nome
    // (idempotente por linha, como o seed de checkpoint); o gate é resolvido
    // por codigo — nunca por nome exibido nem por ordem, que mudam.
    const cameras = [
      { nome: 'CAM-01', etapaCodigo: 'adesivacao', fonteFisica: 'etiqueta' },
      { nome: 'CAM-02', etapaCodigo: 'serigrafia', fonteFisica: 'frente' },
      { nome: 'CAM-03', etapaCodigo: 'oleo-conferencia', fonteFisica: 'topo' },
      { nome: 'CAM-04', etapaCodigo: 'fixacao-placa', fonteFisica: 'placa' },
    ];
    for (const { nome, etapaCodigo, fonteFisica } of cameras) {
      // Checkpoint ausente não derruba o seed: a câmera nasce sem vínculo
      // (estado que a UI já representa) e o vínculo entra num re-seed.
      const checkpoint = await this.checkpointRepository.findOne({
        where: { codigo: etapaCodigo },
      });
      const dados = { nome, fonteFisica, ativa: true, checkpoint };
      const existente = await this.repository.findOne({ where: { nome } });
      if (existente) {
        await this.repository.save({ ...existente, ...dados });
      } else {
        await this.repository.save(this.repository.create(dados));
      }
    }
  }
}
