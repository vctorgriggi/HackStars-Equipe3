import { Module } from '@nestjs/common';
import { PassagemRepository } from '../passagem.repository';
import { PassagemRelationalRepository } from './repositories/passagem.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassagemEntity } from './entities/passagem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PassagemEntity])],
  providers: [
    {
      provide: PassagemRepository,
      useClass: PassagemRelationalRepository,
    },
  ],
  exports: [PassagemRepository],
})
export class RelationalPassagemPersistenceModule {}
