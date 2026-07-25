import { CampoConferidosModule } from '../campo-conferidos/campo-conferidos.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { ProjetoModelosModule } from '../projeto-modelos/projeto-modelos.module';
import { TransformadorsModule } from '../transformadors/transformadors.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { ConferenciaService } from './conferencia.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaController } from './conferencia.controller';
import { RelationalConferenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadorsModule,

    ProjetoModelosModule,

    // Ciclo inevitavel: CampoConferido aponta para Conferencia (filho -> pai)
    // e a execucao precisa gravar os campos do resultado da engine.
    forwardRef(() => CampoConferidosModule),

    // do not remove this comment
    RelationalConferenciaPersistenceModule,
  ],
  controllers: [ConferenciaController],
  providers: [ConferenciaService, ConferenciaExecucaoService],
  exports: [
    ConferenciaService,
    ConferenciaExecucaoService,
    RelationalConferenciaPersistenceModule,
  ],
})
export class ConferenciaModule {}
