import { ProjetosModeloModule } from '../projetos-modelo/projetos-modelo.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TransformadoresService } from './transformadores.service';
import { TransformadoresController } from './transformadores.controller';
import { RelationalTransformadorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ProjetosModeloModule,

    // do not remove this comment
    RelationalTransformadorPersistenceModule,
  ],
  controllers: [TransformadoresController],
  providers: [TransformadoresService],
  exports: [TransformadoresService, RelationalTransformadorPersistenceModule],
})
export class TransformadoresModule {}
