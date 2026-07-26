import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { RelationalClientePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalClientePersistenceModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService, RelationalClientePersistenceModule],
})
export class ClientesModule {}
