import { CamposConferidosModule } from '../campos-conferidos/campos-conferidos.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { ExtracaoModule } from '../extracao/extracao.module';
import { FotosEvidenciaModule } from '../fotos-evidencia/fotos-evidencia.module';
import { ProjetosModeloModule } from '../projetos-modelo/projetos-modelo.module';
import { TransformadoresModule } from '../transformadores/transformadores.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { ConferenciasService } from './conferencias.service';
import { ConferenciaConsultasService } from './consultas/conferencia-consultas.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ConferenciasController } from './conferencias.controller';
import { RelationalConferenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadoresModule,

    ProjetosModeloModule,

    // Sem ciclo: `extracao` e modulo de servico, nao conhece dominio.
    ExtracaoModule,

    // Ciclo inevitavel: CampoConferido aponta para Conferencia (filho -> pai)
    // e a execucao precisa gravar os campos do resultado da engine.
    forwardRef(() => CamposConferidosModule),

    // Ciclo inevitavel: FotosEvidenciaModule ja importava ConferenciasModule
    // (evidencia aponta para conferencia) e agora a extracao precisa ler os
    // bytes da evidencia. Quebrar isso exigiria um terceiro modulo so para
    // storage — custo que nao se paga nesta rodada.
    forwardRef(() => FotosEvidenciaModule),

    // do not remove this comment
    RelationalConferenciaPersistenceModule,
  ],
  controllers: [ConferenciasController],
  providers: [
    ConferenciasService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
    ConferenciaConsultasService,
  ],
  exports: [
    ConferenciasService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
    ConferenciaConsultasService,
    RelationalConferenciaPersistenceModule,
  ],
})
export class ConferenciasModule {}
