import { Module } from '@nestjs/common';
import { CampoConferidoRepository } from '../campo-conferido.repository';
import { CampoConferidoRelationalRepository } from './repositories/campo-conferido.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampoConferidoEntity } from './entities/campo-conferido.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampoConferidoEntity])],
  providers: [
    {
      provide: CampoConferidoRepository,
      useClass: CampoConferidoRelationalRepository,
    },
  ],
  exports: [CampoConferidoRepository],
})
export class RelationalCampoConferidoPersistenceModule {}
