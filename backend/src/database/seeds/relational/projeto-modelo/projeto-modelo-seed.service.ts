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
    // Checklist transcrita do desenho EPT-163-PI-676 (peça de demo), cobrindo
    // os campos do critério de aceitação 1 do SPEC. A chave `campo` de cada
    // item vira CampoConferido.nomeCampo; `fonteFisica` casa com
    // FotoEvidencia.fonteFisica. Ajustar itens com a TRAEL.
    const checklist = [
      {
        campo: 'serie-chumbada-1',
        fonteFisica: 'chumbado-1',
        obrigatorio: true,
      },
      {
        campo: 'serie-chumbada-2',
        fonteFisica: 'chumbado-2',
        obrigatorio: true,
      },
      {
        campo: 'serie-chumbada-3',
        fonteFisica: 'chumbado-3',
        obrigatorio: true,
      },
      { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
      { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
      {
        campo: 'patrimonio-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: true,
      },
      {
        campo: 'cliente-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: true,
      },
      {
        campo: 'potencia-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: false,
      },
    ];
    const dados = {
      codigo: 'EPT-163-PI-676',
      descricao:
        'Transformador monofásico 10 kVA — modelo serigrafia (peça de demo)',
      checklist: JSON.stringify(checklist),
    };
    // Upsert por codigo (unique): idempotente e atualizável em banco semeado.
    const existente = await this.repository.findOne({
      where: { codigo: dados.codigo },
    });
    if (existente) {
      await this.repository.update(existente.id, dados);
    } else {
      await this.repository.save(this.repository.create(dados));
    }
  }
}
