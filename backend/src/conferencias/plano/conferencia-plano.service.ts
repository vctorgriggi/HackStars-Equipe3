import {
  // common
  Injectable,
} from '@nestjs/common';

import { CheckpointsService } from '../../checkpoints/checkpoints.service';

import { ConferenciaExecucaoService } from '../conferencia-execucao.service';
import { PlanoDeFotos } from '../dto/plano-de-fotos.dto';
import { montarPlanoDeFotos } from './montar-plano-de-fotos';

/**
 * Monta o plano de fotos de um ProjetoModelo: LEITURA pura, sem escrever nada
 * e sem tocar visão.
 *
 * O serviço faz só as três buscas (projeto, checklist, etapas da linha) e
 * entrega a montagem para a função pura `montarPlanoDeFotos`. As duas primeiras
 * buscas são as MESMAS do caminho de conferência — `resolverProjetoModelo` e
 * `lerChecklist` do `ConferenciaExecucaoService`, não cópias locais: o projeto
 * que o plano descreve tem de ser o projeto que a conferência avalia, e o
 * CLAUDE.md registra que duas resoluções independentes já divergiram aqui.
 */
@Injectable()
export class ConferenciaPlanoService {
  constructor(
    private readonly conferenciaExecucaoService: ConferenciaExecucaoService,

    private readonly checkpointsService: CheckpointsService,
  ) {}

  /**
   * `codigoProjeto` vem da query e é opcional. A cascata é a da conferência
   * MENOS o elo do vínculo da peça (aqui não há QR, logo não há peça): código
   * informado → único projeto do banco → 422 `projeto-modelo-indeterminado`.
   */
  async planoDeFotos(codigoProjeto?: string): Promise<PlanoDeFotos> {
    const projetoModelo =
      await this.conferenciaExecucaoService.resolverProjetoModelo(
        codigoProjeto ?? null,
        null,
      );

    const checklist =
      this.conferenciaExecucaoService.lerChecklist(projetoModelo);

    const checkpoints = await this.checkpointsService.findAll();

    return montarPlanoDeFotos({
      projeto: {
        codigo: projetoModelo.codigo,
        descricao: projetoModelo.descricao ?? null,
      },
      checklist,
      etapas: checkpoints.map((checkpoint) => ({
        codigo: checkpoint.codigo,
        nome: checkpoint.nome,
        ordem: checkpoint.ordem,
      })),
    });
  }
}
