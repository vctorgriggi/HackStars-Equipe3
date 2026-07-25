import { FotosEvidenciaModule } from '../fotos-evidencia/fotos-evidencia.module';
import { ConferenciasModule } from '../conferencias/conferencias.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { CamposConferidosService } from './campos-conferidos.service';
import { CamposConferidosController } from './campos-conferidos.controller';
import { RelationalCampoConferidoPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // forwardRef nos dois: ConferenciasModule passou a importar este modulo
    // (a execucao grava os campos do resultado da engine) e FotosEvidenciaModule
    // importa ConferenciasModule — o ciclo passa pelos dois.
    forwardRef(() => FotosEvidenciaModule),

    forwardRef(() => ConferenciasModule),

    // do not remove this comment
    RelationalCampoConferidoPersistenceModule,
  ],
  controllers: [CamposConferidosController],
  providers: [CamposConferidosService],
  exports: [CamposConferidosService, RelationalCampoConferidoPersistenceModule],
})
export class CamposConferidosModule {}
