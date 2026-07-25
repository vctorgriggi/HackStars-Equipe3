import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CheckpointsService } from './checkpoints.service';
import { CheckpointsController } from './checkpoints.controller';
import { RelationalCheckpointPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalCheckpointPersistenceModule,
  ],
  controllers: [CheckpointsController],
  providers: [CheckpointsService],
  exports: [CheckpointsService, RelationalCheckpointPersistenceModule],
})
export class CheckpointsModule {}
