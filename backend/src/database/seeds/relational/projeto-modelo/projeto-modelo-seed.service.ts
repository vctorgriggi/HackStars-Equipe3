import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjetoModeloEntity } from '../../../../projetos-modelo/infrastructure/persistence/relational/entities/projeto-modelo.entity';
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
    //
    // `fonteFisica` é a VISTA da peça onde a marcação aparece (eixo novo de
    // 2026-07-25 — o porquê está na união literal `FonteFisica`, em
    // extracao/ports/extractor.port.ts). O NOME do campo continua dizendo como
    // a marcação foi gravada (`-chumbada-` = relevo, `-serigrafia-` = tinta) e
    // em qual vista ela está — nunca por número de posição.
    //
    // MAPA MEDIDO em 2026-07-25 com as fotos reais da peça (docs/visao-ocr.md,
    // rodada 360°: `fotos-demo/`), A CONFIRMAR contra o desenho com a TRAEL:
    //
    // | campo                          | vista            | obrig. | etapa         |
    // |--------------------------------|------------------|--------|---------------|
    // | serie-chumbada-topo            | topo             | sim    | adesivacao    |
    // | serie-chumbada-lateral-direita | lateral-direita  | sim    | adesivacao    |
    // | serie-chumbada-traseira        | traseira         | sim    | adesivacao    |
    // | patrimonio-serigrafia-topo     | topo             | sim    | serigrafia    |
    // | patrimonio-serigrafia-frente   | frente           | sim    | serigrafia    |
    // | cliente-serigrafia-frente      | frente           | sim    | serigrafia    |
    // | potencia-serigrafia-frente     | frente           | NAO    | serigrafia    |
    // | serie-placa                    | placa (close)    | sim    | fixacao-placa |
    // | patrimonio-placa               | placa (close)    | sim    | fixacao-placa |
    //
    // PATRIMÔNIO EM DUAS FACES: o desenho pede a marcação no topo E na frente
    // (medido: 2 patrimônios em faces diferentes, 100% e 98,5%). A checklist
    // antiga tinha UM `patrimonio-serigrafia`, então "faltou o patrimônio de
    // uma das faces" era uma não conformidade real que passava despercebida.
    //
    // NENHUM ITEM EM `base`: a vista existe no vocabulário (decisão do time —
    // a base será conferida quando houver captura para ela), mas não há foto de
    // base disponível hoje. Declarar campo obrigatório nessa vista tornaria o
    // critério 3 do SPEC ("conjunto de fotos conforme → veredito conforme")
    // inalcançável: o campo sairia sempre `nao_conferivel` por falta de foto.
    const checklist = [
      {
        campo: 'serie-chumbada-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-chumbada-lateral-direita',
        fonteFisica: 'lateral-direita',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-chumbada-traseira',
        fonteFisica: 'traseira',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'patrimonio-serigrafia-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'patrimonio-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'cliente-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'potencia-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: false,
        etapa: 'serigrafia',
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
