import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { RelationalConferenciaPersistenceModule } from '../conferencias/infrastructure/persistence/relational/relational-persistence.module';
import { TransformadoresModule } from '../transformadores/transformadores.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { PassagensService } from './passagens.service';
import { PassagemRegistroService } from './passagem-registro.service';
import { PassagensController } from './passagens.controller';
import { RelationalPassagemPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadoresModule,

    // Modulo FOLHA de persistencia (so TypeOrmModule.forFeature), importado
    // direto de proposito: o scan precisa LER a ultima conferencia da peca, e
    // importar `ConferenciasModule` inteiro criaria ciclo com
    // `TransformadoresModule` sem trazer nada que este fluxo use.
    RelationalConferenciaPersistenceModule,

    // do not remove this comment
    RelationalPassagemPersistenceModule,
  ],
  controllers: [PassagensController],
  providers: [PassagensService, PassagemRegistroService],
  exports: [
    PassagensService,
    PassagemRegistroService,
    RelationalPassagemPersistenceModule,
  ],
})
export class PassagensModule {}
