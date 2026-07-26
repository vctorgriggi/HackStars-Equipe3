import {
  // common
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ConferenciaRepository } from '../../conferencias/infrastructure/persistence/conferencia.repository';
import { PassagemRepository } from '../../passagens/infrastructure/persistence/passagem.repository';
import { IPaginationOptions } from '../../utils/types/pagination-options';

import { Transformador } from '../domain/transformador';
import { TransformadorRepository } from '../infrastructure/persistence/transformador.repository';
import { ConferenciaResumo, resumirConferencia } from './conferencia-resumo';

/** Um evento de transito como a tela de historico precisa dele. */
export interface PassagemResumo {
  id: string;
  createdAt: Date;
  observacao: string | null;
  checkpoint: { codigo: string; nome: string; ordem: number };
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
