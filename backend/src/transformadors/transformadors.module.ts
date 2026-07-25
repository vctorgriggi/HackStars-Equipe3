import { ProjetoModelosModule } from '../projeto-modelos/projeto-modelos.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TransformadorsService } from './transformadors.service';
import { TransformadorsController } from './transformadors.controller';
import { RelationalTransformadorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ProjetoModelosModule,

    // do not remove this comment
    RelationalTransformadorPersistenceModule,
  ],
  controllers: [TransformadorsController],
  providers: [TransformadorsService],
  exports: [TransformadorsService, RelationalTransformadorPersistenceModule],
})
export class TransformadorsModule {}
