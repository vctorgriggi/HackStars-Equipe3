import { Module } from '@nestjs/common';
import { ConferenciaRepository } from '../conferencia.repository';
import { ConferenciaRelationalRepository } from './repositories/conferencia.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConferenciaEntity } from './entities/conferencia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConferenciaEntity])],
  providers: [
    {
      provide: ConferenciaRepository,
      useClass: ConferenciaRelationalRepository,
    },
  ],
  exports: [ConferenciaRepository],
})
export class RelationalConferenciaPersistenceModule {}
