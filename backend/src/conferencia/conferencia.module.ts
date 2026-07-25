import { CampoConferidosModule } from '../campo-conferidos/campo-conferidos.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { ExtracaoModule } from '../extracao/extracao.module';
import { FotoEvidenciaModule } from '../foto-evidencia/foto-evidencia.module';
import { ProjetoModelosModule } from '../projeto-modelos/projeto-modelos.module';
import { TransformadorsModule } from '../transformadors/transformadors.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { ConferenciaService } from './conferencia.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ConferenciaController } from './conferencia.controller';
import { RelationalConferenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadorsModule,

    ProjetoModelosModule,

    // Sem ciclo: `extracao` e modulo de servico, nao conhece dominio.
    ExtracaoModule,

    // Ciclo inevitavel: CampoConferido aponta para Conferencia (filho -> pai)
    // e a execucao precisa gravar os campos do resultado da engine.
    forwardRef(() => CampoConferidosModule),

    // Ciclo inevitavel: FotoEvidenciaModule ja importava ConferenciaModule
    // (evidencia aponta para conferencia) e agora a extracao precisa ler os
    // bytes da evidencia. Quebrar isso exigiria um terceiro modulo so para
    // storage — custo que nao se paga nesta rodada.
    forwardRef(() => FotoEvidenciaModule),

    // do not remove this comment
    RelationalConferenciaPersistenceModule,
  ],
  controllers: [ConferenciaController],
  providers: [
    ConferenciaService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
  ],
  exports: [
    ConferenciaService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
    RelationalConferenciaPersistenceModule,
  ],
})
export class ConferenciaModule {}
