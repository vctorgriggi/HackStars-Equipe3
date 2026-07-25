import { Module } from '@nestjs/common';
import { EventoPassagemRepository } from '../evento-passagem.repository';
import { EventoPassagemRelationalRepository } from './repositories/evento-passagem.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoPassagemEntity } from './entities/evento-passagem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventoPassagemEntity])],
  providers: [
    {
      provide: EventoPassagemRepository,
      useClass: EventoPassagemRelationalRepository,
    },
  ],
  exports: [EventoPassagemRepository],
})
export class RelationalEventoPassagemPersistenceModule {}
