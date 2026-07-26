import { ApiProperty } from '@nestjs/swagger';

import { Conferencia } from '../../conferencias/domain/conferencia';
import {
  DESCRICAO_VEREDITO_GERAL,
  VEREDITOS,
} from '../../conferencias/dto/resultado-execucao.dto';
import { CheckpointResumo } from '../../conferencias/dto/resumos-compartilhados.dto';

/**
 * Projecao de LEITURA de uma conferencia nas telas centradas na peca (scan em
 * checkpoint e historico). Existe por dois motivos:
 *
 * 1. gap 3 do CLAUDE.md — as relacoes geradas sao `eager`, entao devolver a
 *    entidade inteira arrastaria peca + checkpoint + projeto em cada item;
 * 2. o front nao recalcula nada (regra de ouro): `vereditoGeral` chega pronto,
 *    do jeito que a engine gravou.
 *
 * `etapa` acompanha o veredito de proposito (gap 14): "ultima conferencia
 * conforme" NAO atesta peca completa — pode ser o conforme parcial de um gate.
 * Quem exibe o alerta precisa ver as duas coisas juntas.
 */
export class ConferenciaResumo {
  @ApiProperty({
    type: String,
    example: 'a4f9c1d2-7b3e-4c58-9de0-1f2a3b4c5d6e',
    description:
      'Id da conferencia — abra `GET /conferencias/{id}/campos` para o ' +
      'veredito campo a campo com as evidencias.',
  })
  id: string;

  @ApiProperty({
    enum: VEREDITOS,
    nullable: true,
    example: 'divergente',
    description: DESCRICAO_VEREDITO_GERAL,
  })
  vereditoGeral: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: CheckpointResumo,
    nullable: true,
    description:
      'Etapa em que este veredito saiu; `null` = conferencia da checklist ' +
      'inteira. LEIA SEMPRE JUNTO do veredito: `conforme` de um gate parcial ' +
      'nao atesta a peca completa (gap 14 do CLAUDE.md).',
  })
  checkpoint: CheckpointResumo | null;
}

export function resumirConferencia(
  conferencia: Conferencia,
): ConferenciaResumo {
  return {
    id: conferencia.id,
    vereditoGeral: conferencia.vereditoGeral ?? null,
    createdAt: conferencia.createdAt,
    checkpoint: conferencia.checkpoint
      ? {
          codigo: conferencia.checkpoint.codigo,
          nome: conferencia.checkpoint.nome,
        }
      : null,
  };
}
