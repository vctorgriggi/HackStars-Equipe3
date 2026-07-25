import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { TransformadoresModule } from '../transformadores/transformadores.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { PassagensService } from './passagens.service';
import { PassagensController } from './passagens.controller';
import { RelationalPassagemPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadoresModule,

    // do not remove this comment
    RelationalPassagemPersistenceModule,
  ],
  controllers: [PassagensController],
  providers: [PassagensService],
  exports: [PassagensService, RelationalPassagemPersistenceModule],
})
export class PassagensModule {}
