import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjetoModeloEntity } from '../../../../projeto-modelos/infrastructure/persistence/relational/entities/projeto-modelo.entity';
import { ProjetoModeloSeedService } from './projeto-modelo-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjetoModeloEntity])],
  providers: [ProjetoModeloSeedService],
  exports: [ProjetoModeloSeedService],
})
export class ProjetoModeloSeedModule {}
