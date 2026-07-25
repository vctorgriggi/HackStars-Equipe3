import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { TransformadorsModule } from '../transformadors/transformadors.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { EventoPassagemsService } from './evento-passagems.service';
import { EventoPassagemsController } from './evento-passagems.controller';
import { RelationalEventoPassagemPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadorsModule,

    // do not remove this comment
    RelationalEventoPassagemPersistenceModule,
  ],
  controllers: [EventoPassagemsController],
  providers: [EventoPassagemsService],
  exports: [EventoPassagemsService, RelationalEventoPassagemPersistenceModule],
})
export class EventoPassagemsModule {}
