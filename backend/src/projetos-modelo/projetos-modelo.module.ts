import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ProjetosModeloService } from './projetos-modelo.service';
import { ProjetosModeloConsultasService } from './consultas/projetos-modelo-consultas.service';
import { ProjetosModeloController } from './projetos-modelo.controller';
import { RelationalProjetoModeloPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { RelationalTransformadorPersistenceModule } from '../transformadores/infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // Modulo FOLHA de persistencia para o contador de pecas por projeto:
    // importar `TransformadoresModule` fecharia ciclo (ele importa este).
    RelationalTransformadorPersistenceModule,

    // do not remove this comment
    RelationalProjetoModeloPersistenceModule,
  ],
  controllers: [ProjetosModeloController],
  providers: [ProjetosModeloService, ProjetosModeloConsultasService],
  exports: [ProjetosModeloService, RelationalProjetoModeloPersistenceModule],
})
export class ProjetosModeloModule {}
