import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesConsultasService } from './consultas/clientes-consultas.service';
import { ClientesController } from './clientes.controller';
import { RelationalClientePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { RelationalConferenciaPersistenceModule } from '../conferencias/infrastructure/persistence/relational/relational-persistence.module';
import { RelationalTransformadorPersistenceModule } from '../transformadores/infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // Modulos FOLHA de persistencia para os contadores da listagem: importar
    // `TransformadoresModule` fecharia ciclo (ele importa este modulo).
    RelationalTransformadorPersistenceModule,

    RelationalConferenciaPersistenceModule,

    // do not remove this comment
    RelationalClientePersistenceModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService, ClientesConsultasService],
  exports: [ClientesService, RelationalClientePersistenceModule],
})
export class ClientesModule {}
