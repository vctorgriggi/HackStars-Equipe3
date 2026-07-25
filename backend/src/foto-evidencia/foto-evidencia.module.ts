import { ConferenciaModule } from '../conferencia/conferencia.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { FotoEvidenciaService } from './foto-evidencia.service';
import { FotoEvidenciaController } from './foto-evidencia.controller';
import { RelationalFotoEvidenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import fileConfig from '../files/config/file.config';
import { FileConfig, FileDriver } from '../files/config/file-config.type';
import { FilesLocalModule } from '../files/infrastructure/uploader/local/files.module';
import { FilesLocalService } from '../files/infrastructure/uploader/local/files.service';
import { FilesS3Module } from '../files/infrastructure/uploader/s3/files.module';
import { FilesS3Service } from '../files/infrastructure/uploader/s3/files.service';
import { EvidenciaUploader } from './infrastructure/uploader/evidencia-uploader';

// Mesmo mecanismo do boilerplate: o FILE_DRIVER escolhe o uploader. O módulo
// importado também exporta o MulterModule, então o FileInterceptor deste
// módulo grava com o storage do driver ativo (disco em local, bucket em s3) —
// nada de storage próprio aqui. O driver `s3-presigned` não faz upload
// server-side (o cliente sobe direto no bucket), por isso cai no uploader s3.
const isLocalDriver = (fileConfig() as FileConfig).driver === FileDriver.LOCAL;

const infrastructureUploaderModule = isLocalDriver
  ? FilesLocalModule
  : FilesS3Module;

@Module({
  imports: [
    // forwardRef nos dois lados: ConferenciaModule passou a importar este
    // modulo (a extracao le os bytes da evidencia pelo FotoEvidenciaService)
    // e este ja importava aquele (evidencia aponta para conferencia).
    forwardRef(() => ConferenciaModule),

    // do not remove this comment
    RelationalFotoEvidenciaPersistenceModule,
    infrastructureUploaderModule,
  ],
  controllers: [FotoEvidenciaController],
  providers: [
    FotoEvidenciaService,
    {
      provide: EvidenciaUploader,
      useExisting: isLocalDriver ? FilesLocalService : FilesS3Service,
    },
  ],
  exports: [FotoEvidenciaService, RelationalFotoEvidenciaPersistenceModule],
})
export class FotoEvidenciaModule {}
