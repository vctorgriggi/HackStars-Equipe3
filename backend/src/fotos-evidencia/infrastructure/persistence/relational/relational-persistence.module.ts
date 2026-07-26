import { Module } from '@nestjs/common';
import { FotoEvidenciaRepository } from '../foto-evidencia.repository';
import { FotoEvidenciaRelationalRepository } from './repositories/foto-evidencia.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FotoEvidenciaEntity } from './entities/foto-evidencia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FotoEvidenciaEntity])],
  providers: [
    {
      provide: FotoEvidenciaRepository,
      useClass: FotoEvidenciaRelationalRepository,
    },
  ],
  exports: [FotoEvidenciaRepository],
})
export class RelationalFotoEvidenciaPersistenceModule {}
