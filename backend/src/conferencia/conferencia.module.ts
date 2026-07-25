import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { TransformadorsModule } from '../transformadors/transformadors.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ConferenciaService } from './conferencia.service';
import { ConferenciaController } from './conferencia.controller';
import { RelationalConferenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadorsModule,

    // do not remove this comment
    RelationalConferenciaPersistenceModule,
  ],
  controllers: [ConferenciaController],
  providers: [ConferenciaService],
  exports: [ConferenciaService, RelationalConferenciaPersistenceModule],
})
export class ConferenciaModule {}
