import { Module } from '@nestjs/common';
import { ProjetoModeloRepository } from '../projeto-modelo.repository';
import { ProjetoModeloRelationalRepository } from './repositories/projeto-modelo.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjetoModeloEntity } from './entities/projeto-modelo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjetoModeloEntity])],
  providers: [
    {
      provide: ProjetoModeloRepository,
      useClass: ProjetoModeloRelationalRepository,
    },
  ],
  exports: [ProjetoModeloRepository],
})
export class RelationalProjetoModeloPersistenceModule {}
