import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CheckpointEntity } from '../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { PassagemEntity } from '../passagens/infrastructure/persistence/relational/entities/passagem.entity';

import { AnuncioPassagemService } from './anuncio-passagem.service';
import { OcupacaoEsteiraService } from './consultas/ocupacao-esteira.service';
import { TempoRealController } from './tempo-real.controller';
import { TempoRealGateway } from './tempo-real.gateway';

/**
 * Tempo real da linha: gateway Socket.IO (namespace `/tempo-real`), snapshot
 * de ocupacao e o servico de anuncio que `passagens/` chama apos gravar.
 *
 * A dependencia e de mao UNICA: `PassagensModule` importa este modulo, nunca
 * o contrario — as consultas falam com as entidades direto
 * (`TypeOrmModule.forFeature`), entao nao ha ciclo nem forwardRef.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CheckpointEntity, PassagemEntity])],
  controllers: [TempoRealController],
  providers: [TempoRealGateway, OcupacaoEsteiraService, AnuncioPassagemService],
  exports: [AnuncioPassagemService],
})
export class TempoRealModule {}
