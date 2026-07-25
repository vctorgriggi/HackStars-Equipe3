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
    //
    // `etapa` é o `codigo` do Checkpoint em que a marcação passa a EXISTIR
    // fisicamente na peça — ou seja, o ponto do fluxo a partir do qual ela é
    // conferível. A conferência por etapa é cumulativa: o gate cobra os itens
    // dessa etapa e de todas as anteriores (o gate da placa reconfere o
    // chumbado, que é como se detecta troca de peça entre etapas). Sem isso,
    // o gate da adesivação cobraria a placa que ainda nem foi fixada e
    // devolveria `nao_conferivel` por marcação inexistente.
    const checklist = [
      {
        campo: 'serie-chumbada-1',
        fonteFisica: 'chumbado-1',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-chumbada-2',
        fonteFisica: 'chumbado-2',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-chumbada-3',
        fonteFisica: 'chumbado-3',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-placa',
        fonteFisica: 'placa',
        obrigatorio: true,
        etapa: 'fixacao-placa',
      },
      {
        campo: 'patrimonio-placa',
        fonteFisica: 'placa',
        obrigatorio: true,
        etapa: 'fixacao-placa',
      },
      {
        campo: 'patrimonio-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'cliente-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'potencia-serigrafia',
        fonteFisica: 'serigrafia',
        obrigatorio: false,
        etapa: 'serigrafia',
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
