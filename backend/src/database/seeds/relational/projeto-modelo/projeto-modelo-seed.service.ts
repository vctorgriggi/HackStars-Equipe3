import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjetoModeloEntity } from '../../../../projeto-modelos/infrastructure/persistence/relational/entities/projeto-modelo.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjetoModeloSeedService {
  constructor(
    @InjectRepository(ProjetoModeloEntity)
    private repository: Repository<ProjetoModeloEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (count === 0) {
      // Checklist transcrita do desenho EPT-163-PI-676 (peça de demo).
      // Nomes de campo casam com CampoConferido.nomeCampo; ajustar com a TRAEL.
      const checklist = [
        { campo: 'serie-chumbada-1', fonteFisica: 'chumbado-1', obrigatorio: true },
        { campo: 'serie-chumbada-2', fonteFisica: 'chumbado-2', obrigatorio: true },
        { campo: 'serie-chumbada-3', fonteFisica: 'chumbado-3', obrigatorio: true },
        { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
        { campo: 'patrimonio-serigrafia', fonteFisica: 'serigrafia', obrigatorio: true },
        { campo: 'cliente-serigrafia', fonteFisica: 'serigrafia', obrigatorio: true },
        { campo: 'potencia-serigrafia', fonteFisica: 'serigrafia', obrigatorio: false },
      ];
      await this.repository.save(
        this.repository.create({
          codigo: 'EPT-163-PI-676',
          descricao:
            'Transformador monofásico 10 kVA — modelo serigrafia (peça de demo)',
          checklist: JSON.stringify(checklist),
        }),
      );
    }
  }
}
