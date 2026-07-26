import { ApiProperty } from '@nestjs/swagger';

/**
 * Projecao da listagem de clientes com os contadores que a tela exibe.
 *
 * CLASSE, nao interface: o Swagger so documenta classes — interface some na
 * compilacao e a rota chegaria ao front com schema de resposta vazio.
 *
 * Os contadores nascem AQUI (na API) de proposito: se a UI precisar de dado
 * derivado, o dado nasce na API (contrato API ↔ Front do CLAUDE.md).
 */
export class ClienteComContadores {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({
    type: String,
    example: 'Energisa Rondônia',
    description:
      'Nome unico do cliente, como veio do QR (find-or-create server-side; ' +
      'a escrita HTTP deste cadastro e fechada).',
  })
  nome: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Pecas (transformadores) vinculadas a este cliente.',
  })
  totalPecas: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description:
      'Pecas cujo veredito VIGENTE (ultima conferencia, como a engine ' +
      'gravou) e `divergente`. Atencao ao gap 14: veredito de gate parcial ' +
      'nao atesta a peca inteira — e peca nunca conferida nao conta aqui.',
  })
  pecasDivergentes: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
