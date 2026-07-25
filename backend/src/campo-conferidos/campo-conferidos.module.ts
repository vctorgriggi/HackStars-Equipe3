import { FotoEvidenciaModule } from '../foto-evidencia/foto-evidencia.module';
import { ConferenciaModule } from '../conferencia/conferencia.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CampoConferidosService } from './campo-conferidos.service';
import { CampoConferidosController } from './campo-conferidos.controller';
import { RelationalCampoConferidoPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    FotoEvidenciaModule,

    ConferenciaModule,

    // do not remove this comment
    RelationalCampoConferidoPersistenceModule,
  ],
  controllers: [CampoConferidosController],
  providers: [CampoConferidosService],
  exports: [CampoConferidosService, RelationalCampoConferidoPersistenceModule],
})
export class CampoConferidosModule {}
