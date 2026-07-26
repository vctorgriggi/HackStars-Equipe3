import { ApiProperty } from '@nestjs/swagger';

import { EtapaResumo } from '../../conferencias/dto/resumos-compartilhados.dto';

/**
 * Fotografia da OCUPACAO da linha: quem esta em cada checkpoint agora.
 * "Estar em um checkpoint" e DERIVADO da ultima passagem da peca (SPEC:
 * posicao nunca e coluna) — peca sem passagem nao esta na linha.
 */

export class PecaNaEsteira {
  @ApiProperty({
    type: String,
    example: '847233',
    description: 'Chave de negocio da peca; e por ela que o front casa.',
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '251328',
  })
  patrimonio: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
    description:
      'Timestamp da passagem que DEFINE a posicao (a mais recente da peca).',
  })
  em: string;
}

export class OcupacaoCheckpoint extends EtapaResumo {
  @ApiProperty({
    type: Number,
    example: 2,
    description: 'Pecas cuja ULTIMA passagem foi neste checkpoint.',
  })
  total: number;

  @ApiProperty({
    type: PecaNaEsteira,
    isArray: true,
    description:
      'As pecas presentes, da mais antiga para a mais recente na etapa.',
  })
  pecas: PecaNaEsteira[];
}

export class EsteiraSnapshot {
  @ApiProperty({
    type: OcupacaoCheckpoint,
    isArray: true,
    description:
      'TODOS os checkpoints da linha, em ordem de `ordem` — checkpoint vazio ' +
      'APARECE com `total: 0` (ausencia de peca nao e ausencia de etapa). O ' +
      'evento Socket.IO `passagem-registrada` (namespace `/tempo-real`) ' +
      'complementa este snapshot com as mudancas ao vivo.',
  })
  checkpoints: OcupacaoCheckpoint[];

  @ApiProperty({
    type: Number,
    example: 5,
    description: 'Soma dos totais: pecas com pelo menos uma passagem.',
  })
  totalNaLinha: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:12.000Z',
  })
  geradoEm: string;
}
