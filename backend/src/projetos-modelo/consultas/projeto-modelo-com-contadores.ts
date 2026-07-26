import { ApiProperty } from '@nestjs/swagger';

/**
 * Projecao da listagem de projetos com os contadores que a tela exibe.
 * CLASSE com @ApiProperty (interface some do Swagger); os contadores nascem
 * na API — contrato API ↔ Front do CLAUDE.md.
 */
export class ProjetoModeloComContadores {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'EPT-163-PI-676' })
  codigo: string;

  @ApiProperty({ type: String, nullable: true })
  descricao?: string | null;

  @ApiProperty({
    type: String,
    description:
      'Checklist crua (string JSON) mantida por compatibilidade com o ' +
      'consumo atual da /demo; as contagens ao lado ja vem resumidas.',
  })
  checklist: string;

  @ApiProperty({
    type: Number,
    example: 2,
    description: 'Pecas (transformadores) vinculadas a este projeto.',
  })
  totalPecas: number;

  @ApiProperty({
    type: Number,
    example: 11,
    description:
      'Itens VALIDOS da checklist (item fora do formato e ignorado; ' +
      'checklist ilegivel resume a zero — a listagem nunca responde 500 ' +
      'por dado ruim).',
  })
  totalCampos: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { adesivacao: 3, serigrafia: 4, 'fixacao-placa': 4 },
    description:
      'Contagem de itens por etapa; a chave e o `codigo` do Checkpoint em ' +
      'que a marcacao passa a existir, e `sem-etapa` agrupa itens conferidos ' +
      'em qualquer etapa.',
  })
  camposPorEtapa: Record<string, number>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
