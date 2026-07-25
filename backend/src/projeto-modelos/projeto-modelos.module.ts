import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ProjetoModelosService } from './projeto-modelos.service';
import { ProjetoModelosController } from './projeto-modelos.controller';
import { RelationalProjetoModeloPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalProjetoModeloPersistenceModule,
  ],
  controllers: [ProjetoModelosController],
  providers: [ProjetoModelosService],
  exports: [ProjetoModelosService, RelationalProjetoModeloPersistenceModule],
})
export class ProjetoModelosModule {}
