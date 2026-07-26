import { ApiProperty } from '@nestjs/swagger';

/**
 * Projecao da listagem de lotes. Lote NAO e entidade: e o recorte das pecas
 * pelo `pedido` que veio na identidade (QR/digitacao) — por isso a chave e o
 * proprio texto do pedido, nao um uuid.
 *
 * CLASSE, nao interface: o Swagger so documenta classes — interface some na
 * compilacao e a rota chegaria ao front com schema de resposta vazio.
 *
 * Tudo aqui e derivado NA API (contrato API ↔ Front): o front so renderiza.
 */
export class LoteResumo {
  @ApiProperty({
    type: String,
    example: '4500123456',
    description:
      'O pedido como veio na identidade da peca — a chave do lote. Pecas ' +
      'sem pedido nao formam lote e nao aparecem nesta listagem.',
  })
  pedido: string;

  @ApiProperty({
    type: Number,
    example: 6,
    description: 'Pecas (transformadores) com este pedido.',
  })
  totalPecas: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description:
      'Pecas cujo veredito VIGENTE (ultima conferencia, como a engine ' +
      'gravou) e `divergente`. Peca nunca conferida nao conta, e veredito ' +
      'de gate parcial nao atesta a peca inteira (gap 14).',
  })
  pecasDivergentes: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '143091 - Energisa Rondônia',
    description:
      'Cliente do lote quando as pecas concordam; `null` quando o pedido ' +
      'tem clientes mistos ou nenhuma peca informou cliente — ausencia se ' +
      'anuncia, nunca se escolhe um em silencio.',
  })
  cliente: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'EPT-163-PI-676',
    description:
      'Codigo do ProjetoModelo quando unico no lote; `null` com projetos ' +
      'mistos ou pecas sem vinculo.',
  })
  projetoCodigo: string | null;

  @ApiProperty({
    type: Number,
    example: 42,
    minimum: 0,
    maximum: 100,
    description:
      'Progresso de TRANSITO do lote, 0–100: media por peca de (ordem da ' +
      'ultima passagem / maior ordem da linha); peca sem passagem conta 0. ' +
      'E posicao na esteira, NAO atestado de conformidade — conformidade e ' +
      'so `pecasDivergentes` e o veredito por peca.',
  })
  progressoPct: number;
}
