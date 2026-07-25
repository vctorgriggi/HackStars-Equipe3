import { ConferenciaModule } from '../conferencia/conferencia.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { FotoEvidenciaService } from './foto-evidencia.service';
import { FotoEvidenciaController } from './foto-evidencia.controller';
import { RelationalFotoEvidenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ConferenciaModule,

    // do not remove this comment
    RelationalFotoEvidenciaPersistenceModule,
  ],
  controllers: [FotoEvidenciaController],
  providers: [FotoEvidenciaService],
  exports: [FotoEvidenciaService, RelationalFotoEvidenciaPersistenceModule],
})
export class FotoEvidenciaModule {}
