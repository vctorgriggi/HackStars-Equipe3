import { ProjetosModeloModule } from '../projetos-modelo/projetos-modelo.module';
import { RelationalConferenciaPersistenceModule } from '../conferencias/infrastructure/persistence/relational/relational-persistence.module';
import { RelationalPassagemPersistenceModule } from '../passagens/infrastructure/persistence/relational/relational-persistence.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TransformadoresService } from './transformadores.service';
import { TransformadorConsultasService } from './consultas/transformador-consultas.service';
import { TransformadoresController } from './transformadores.controller';
import { RelationalTransformadorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ProjetosModeloModule,

    // Modulos FOLHA de persistencia (so TypeOrmModule.forFeature). As rotas
    // /transformadores/:id/passagens e /:id/conferencias sao leitura da peca;
    // importar `PassagensModule`/`ConferenciasModule` inteiros fecharia ciclo
    // (os dois ja importam este modulo) sem necessidade nenhuma.
    RelationalPassagemPersistenceModule,

    RelationalConferenciaPersistenceModule,

    // do not remove this comment
    RelationalTransformadorPersistenceModule,
  ],
  controllers: [TransformadoresController],
  providers: [TransformadoresService, TransformadorConsultasService],
  exports: [
    TransformadoresService,
    TransformadorConsultasService,
    RelationalTransformadorPersistenceModule,
  ],
})
export class TransformadoresModule {}
