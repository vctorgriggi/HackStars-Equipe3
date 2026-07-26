import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ProjetosModeloService } from './projetos-modelo.service';
import { ProjetosModeloController } from './projetos-modelo.controller';
import { RelationalProjetoModeloPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalProjetoModeloPersistenceModule,
  ],
  controllers: [ProjetosModeloController],
  providers: [ProjetosModeloService],
  exports: [ProjetosModeloService, RelationalProjetoModeloPersistenceModule],
})
export class ProjetosModeloModule {}
