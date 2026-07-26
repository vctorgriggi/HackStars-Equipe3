import {
  // common
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ApiProperty } from '@nestjs/swagger';

import { ConferenciaRepository } from '../../conferencias/infrastructure/persistence/conferencia.repository';
import { EtapaResumo } from '../../conferencias/dto/resumos-compartilhados.dto';
import { PassagemRepository } from '../../passagens/infrastructure/persistence/passagem.repository';
import { IPaginationOptions } from '../../utils/types/pagination-options';

import { Transformador } from '../domain/transformador';
import {
  FiltroTransformador,
  TransformadorRepository,
} from '../infrastructure/persistence/transformador.repository';
import { ConferenciaResumo, resumirConferencia } from './conferencia-resumo';
import { TransformadorComSituacao } from './transformador-situacao';

/**
 * Um evento de transito como a tela de historico precisa dele.
 *
 * CLASSE, nao interface: o Swagger so documenta classes, e sem ela o
 * `GET /transformadores/{id}/passagens` chegava ao front com schema de
 * resposta vazio.
 */
export class PassagemResumo {
  @ApiProperty({
    type: String,
    example: '7c2b9e10-4d5a-4b6c-8e9f-0a1b2c3d4e5f',
  })
  id: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
    description: 'Timestamp da passagem — o eixo da ordenacao cronologica.',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Anotacao do operador no scan (ex.: "parou por erro aceito pelo time — ' +
      'motivo"); `null` quando nao houve.',
  })
  observacao: string | null;

  @ApiProperty({
    type: EtapaResumo,
    description: 'Etapa da linha em que o scan aconteceu.',
  })
  checkpoint: EtapaResumo;
}

/**
 * Leituras centradas na PECA (gap 4 do CLAUDE.md: as listagens geradas so
 * paginam o banco inteiro). Consome os repositorios de passagem e conferencia
 * direto porque sao portas de persistencia — modulos folha, sem ciclo com
 * `transformadores` e sem regra de dominio no caminho.
 *
 * Nada aqui compara, deriva ou corrige veredito: le o que a engine gravou e
 * recorta o payload (as relacoes geradas sao `eager`, gap 3).
 */
@Injectable()
export class TransformadorConsultasService {
  constructor(
    private readonly transformadorRepository: TransformadorRepository,

    private readonly passagemRepository: PassagemRepository,

    private readonly conferenciaRepository: ConferenciaRepository,
  ) {}

  /**
   * Listagem de pecas com a SITUACAO derivada por item: veredito vigente
   * (ultima conferencia, como a engine gravou) e etapa atual (ultima
   * passagem). Duas queries DISTINCT ON sobre os ids da pagina — nunca uma
   * consulta por linha. Nada aqui compara nem recalcula: e leitura do que ja
   * esta no banco, projetada enxuta (sem a checklist eager do projeto).
   */
  async listarComSituacao({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: FiltroTransformador | null;
    paginationOptions: IPaginationOptions;
  }): Promise<TransformadorComSituacao[]> {
    const pecas = await this.transformadorRepository.findAllWithPagination({
      filterOptions,
      paginationOptions,
    });

    const ids = pecas.map((peca) => peca.id);
    const [vigentes, ultimasPassagens] = await Promise.all([
      this.conferenciaRepository.findUltimaPorTransformadores(ids),
      this.passagemRepository.findUltimaPorTransformadores(ids),
    ]);

    return pecas.map((peca) => {
      const vigente = vigentes.get(peca.id) ?? null;
      const ultimaPassagem = ultimasPassagens.get(peca.id) ?? null;

      return {
        id: peca.id,
        numeroSerie: peca.numeroSerie,
        patrimonio: peca.patrimonio,
        cliente: peca.cliente,
        pedido: peca.pedido ?? null,
        seq: peca.seq ?? null,
        descricao: peca.descricao ?? null,
        createdAt: peca.createdAt,
        projetoModelo: peca.projetoModelo
          ? { codigo: peca.projetoModelo.codigo }
          : null,
        vereditoVigente: vigente ? resumirConferencia(vigente) : null,
        etapaAtual: ultimaPassagem
          ? {
              checkpoint: {
                codigo: ultimaPassagem.checkpoint.codigo,
                nome: ultimaPassagem.checkpoint.nome,
                ordem: ultimaPassagem.checkpoint.ordem,
              },
              em: ultimaPassagem.createdAt,
            }
          : null,
      };
    });
  }

  /**
   * Historico de transito em ordem CRONOLOGICA (criterio 5 do SPEC). Peca
   * inexistente e 404 — sem isso, id errado devolveria lista vazia e passaria
   * por "peca que nunca passou por lugar nenhum".
   */
  async historicoDePassagens({
    transformadorId,
    paginationOptions,
  }: {
    transformadorId: Transformador['id'];
    paginationOptions: IPaginationOptions;
  }): Promise<PassagemResumo[]> {
    await this.exigirTransformador(transformadorId);

    const passagens = await this.passagemRepository.findAllByTransformador({
      transformadorId,
      paginationOptions,
    });

    return passagens.map((passagem) => ({
      id: passagem.id,
      createdAt: passagem.createdAt,
      observacao: passagem.observacao ?? null,
      checkpoint: {
        codigo: passagem.checkpoint.codigo,
        nome: passagem.checkpoint.nome,
        ordem: passagem.checkpoint.ordem,
      },
    }));
  }

  /**
   * Conferencias da peca, da mais recente para a mais antiga: a primeira e o
   * veredito vigente, que sustenta o alerta FORA da tela de veredito
   * (criterio 6 do SPEC).
   */
  async historicoDeConferencias({
    transformadorId,
    limit,
  }: {
    transformadorId: Transformador['id'];
    limit: number;
  }): Promise<ConferenciaResumo[]> {
    await this.exigirTransformador(transformadorId);

    const conferencias =
      await this.conferenciaRepository.findAllByTransformador({
        transformadorId,
        limit,
      });

    return conferencias.map(resumirConferencia);
  }

  private async exigirTransformador(
    transformadorId: Transformador['id'],
  ): Promise<void> {
    const transformador =
      await this.transformadorRepository.findById(transformadorId);
    if (!transformador) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          transformador: `transformador-inexistente: ${transformadorId}`,
        },
      });
    }
  }
}
