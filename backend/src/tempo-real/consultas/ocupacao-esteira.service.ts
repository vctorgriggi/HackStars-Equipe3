import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CheckpointEntity } from '../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { PassagemEntity } from '../../passagens/infrastructure/persistence/relational/entities/passagem.entity';

import { EsteiraSnapshot } from '../dto/esteira-snapshot.dto';
import { TotalDoCheckpoint } from '../dto/evento-passagem-registrada.dto';
import {
  EtapaDaLinha,
  montarOcupacao,
  totaisDaOcupacao,
  UltimaPassagemDaPeca,
} from './montar-ocupacao';

/**
 * Ocupacao da linha para a esteira de tempo real. Mesmo desenho do
 * `IndicadoresService` (e pelo mesmo motivo): TypeORM DIRETO, porque as
 * portas de persistencia devolvem agregados com relacoes eager — contar
 * pecas por checkpoint com elas seria carregar a linha inteira na memoria.
 * Aqui a agregacao e do banco (`DISTINCT ON`), e read-only por construcao.
 *
 * Duas queries de tamanho fixo por chamada, nunca uma por peca.
 */
@Injectable()
export class OcupacaoEsteiraService {
  constructor(
    @InjectRepository(CheckpointEntity)
    private readonly checkpointRepository: Repository<CheckpointEntity>,

    @InjectRepository(PassagemEntity)
    private readonly passagemRepository: Repository<PassagemEntity>,
  ) {}

  async snapshot(): Promise<EsteiraSnapshot> {
    const [etapas, pecas] = await Promise.all([
      this.lerEtapas(),
      this.lerUltimasPassagens(),
    ]);

    return montarOcupacao({
      etapas,
      pecas,
      geradoEm: new Date().toISOString(),
    });
  }

  /** Os totais que o evento `passagem-registrada` carrega. */
  async totais(): Promise<TotalDoCheckpoint[]> {
    return totaisDaOcupacao(await this.snapshot());
  }

  private async lerEtapas(): Promise<EtapaDaLinha[]> {
    const linhas = await this.checkpointRepository
      .createQueryBuilder('checkpoint')
      .select('checkpoint.codigo', 'codigo')
      .addSelect('checkpoint.nome', 'nome')
      .addSelect('checkpoint.ordem', 'ordem')
      .orderBy('checkpoint.ordem', 'ASC')
      .getRawMany<{ codigo: string; nome: string; ordem: number | string }>();

    return linhas.map((linha) => ({
      codigo: linha.codigo,
      nome: linha.nome,
      ordem: Number(linha.ordem),
    }));
  }

  /**
   * A passagem MAIS RECENTE de cada peca (posicao atual, derivada — SPEC),
   * numa unica query: `DISTINCT ON` + `ORDER BY` e o jeito do Postgres de
   * dizer "a primeira linha de cada peca". Desempate por `id DESC` copiado de
   * `indicadores.service.ts`: dois scans no mesmo instante devolveriam
   * vencedora aleatoria sem ele.
   */
  private async lerUltimasPassagens(): Promise<UltimaPassagemDaPeca[]> {
    const linhas = await this.passagemRepository
      .createQueryBuilder('passagem')
      .distinctOn(['transformador.id'])
      .innerJoin('passagem.transformador', 'transformador')
      .innerJoin('passagem.checkpoint', 'checkpoint')
      .select('transformador.numeroSerie', 'numeroSerie')
      .addSelect('transformador.patrimonio', 'patrimonio')
      .addSelect('passagem.createdAt', 'em')
      .addSelect('checkpoint.codigo', 'checkpointCodigo')
      .orderBy('transformador.id')
      .addOrderBy('passagem.createdAt', 'DESC')
      .addOrderBy('passagem.id', 'DESC')
      .getRawMany<{
        numeroSerie: string;
        patrimonio: string | null;
        em: Date | string;
        checkpointCodigo: string;
      }>();

    return linhas.map((linha) => ({
      numeroSerie: linha.numeroSerie,
      patrimonio: linha.patrimonio ?? null,
      em: paraIso(linha.em),
      checkpointCodigo: linha.checkpointCodigo,
    }));
  }
}

function paraIso(valor: Date | string): string {
  return valor instanceof Date
    ? valor.toISOString()
    : new Date(valor).toISOString();
}
