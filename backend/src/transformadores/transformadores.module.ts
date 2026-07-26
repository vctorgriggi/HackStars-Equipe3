import { ClientesModule } from '../clientes/clientes.module';
import { ProjetosModeloModule } from '../projetos-modelo/projetos-modelo.module';
import { RelationalCheckpointPersistenceModule } from '../checkpoints/infrastructure/persistence/relational/relational-persistence.module';
import { RelationalConferenciaPersistenceModule } from '../conferencias/infrastructure/persistence/relational/relational-persistence.module';
import { RelationalPassagemPersistenceModule } from '../passagens/infrastructure/persistence/relational/relational-persistence.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TransformadoresService } from './transformadores.service';
import { TransformadorConsultasService } from './consultas/transformador-consultas.service';
import { LotesConsultasService } from './consultas/lotes-consultas.service';
import { TransformadoresController } from './transformadores.controller';
import { LotesController } from './lotes.controller';
import { RelationalTransformadorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ClientesModule,

    ProjetosModeloModule,

    // Modulos FOLHA de persistencia (so TypeOrmModule.forFeature). As rotas
    // /transformadores/:id/passagens e /:id/conferencias sao leitura da peca;
    // importar `PassagensModule`/`ConferenciasModule` inteiros fecharia ciclo
    // (os dois ja importam este modulo) sem necessidade nenhuma.
    RelationalPassagemPersistenceModule,

    RelationalConferenciaPersistenceModule,

    // So leitura da ordem maxima da linha (progresso do lote).
    RelationalCheckpointPersistenceModule,

    // do not remove this comment
    RelationalTransformadorPersistenceModule,
  ],
  controllers: [TransformadoresController, LotesController],
  providers: [
    TransformadoresService,
    TransformadorConsultasService,
    LotesConsultasService,
  ],
  exports: [
    TransformadoresService,
    TransformadorConsultasService,
    RelationalTransformadorPersistenceModule,
  ],
})
export class TransformadoresModule {}
