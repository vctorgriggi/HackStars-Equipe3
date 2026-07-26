import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { CamerasController } from './cameras.controller';
import { RelationalCameraPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    // do not remove this comment
    RelationalCameraPersistenceModule,
  ],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService, RelationalCameraPersistenceModule],
})
export class CamerasModule {}
