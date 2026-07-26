import { ApiProperty } from '@nestjs/swagger';

import { EtapaResumo } from '../../conferencias/dto/resumos-compartilhados.dto';
import { ConferenciaResumo } from './conferencia-resumo';

/**
 * Item da listagem de pecas com a SITUACAO derivada que a tela precisa:
 * o veredito vigente (ultima conferencia gravada pela engine) e a etapa atual
 * (ultima passagem — posicao na linha e derivada, nunca coluna duplicada).
 *
 * Existe porque o contrato API <-> Front proibe o front de derivar dado: se a
 * tela precisa de "status da peca", o dado nasce aqui, lido do que ja esta
 * gravado — nada e comparado nem recalculado neste caminho.
 *
 * Tambem e a projecao ENXUTA da peca: a entidade gerada arrasta o
 * ProjetoModelo eager com a checklist inteira em cada item (gap 3); aqui o
 * projeto vira so o codigo.
 */
export class ProjetoModeloResumo {
  @ApiProperty({
    type: String,
    example: 'EPT-163-PI-676',
    description: 'Codigo do projeto de serigrafia vinculado a peca.',
  })
  codigo: string;
}

export class EtapaAtualResumo {
  @ApiProperty({
    type: EtapaResumo,
    description: 'Checkpoint da ULTIMA passagem registrada da peca.',
  })
  checkpoint: EtapaResumo;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
    description: 'Quando a peca passou por ele.',
  })
  em: Date;
}

export class TransformadorComSituacao {
  @ApiProperty({
    type: String,
    example: '3f6d1b2e-9c4a-4f5b-8a7d-2e1c0b9a8f7e',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '847233',
    description:
      'Chave de negocio da peca (serie do fabricante, chumbada 3x no metal).',
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
    example: '251328',
    description:
      'Numeracao do CLIENTE: unica por cliente, nao globalmente — nunca serve ' +
      'de chave.',
  })
  patrimonio: string;

  @ApiProperty({
    type: String,
    example: 'Energisa',
    description:
      'Cliente como texto do QR (a fonte da verdade). String vazia quando a ' +
      'etiqueta nao trouxe o dado. O cadastro proprio (entidade Cliente) e ' +
      'vinculado por find-or-create a partir deste texto.',
  })
  cliente: string;

  @ApiProperty({ type: String, nullable: true, example: '91616' })
  pedido: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  seq: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  descricao: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-25T18:40:00.000Z',
    description: 'Quando a peca entrou no cadastro.',
  })
  createdAt: Date;

  @ApiProperty({
    type: ProjetoModeloResumo,
    nullable: true,
    description:
      'So o codigo do projeto — a checklist NAO viaja na listagem de ' +
      'proposito (payload enxuto).',
  })
  projetoModelo: ProjetoModeloResumo | null;

  @ApiProperty({
    type: ConferenciaResumo,
    nullable: true,
    description:
      'A conferencia mais recente da peca, como a engine a gravou. `null` = ' +
      'peca nunca conferida (estado legitimo, nao erro — exiba "sem ' +
      'conferencia", nunca invente veredito). LEIA JUNTO do `checkpoint` ' +
      'interno: veredito de gate parcial nao atesta a peca inteira (gap 14).',
  })
  vereditoVigente: ConferenciaResumo | null;

  @ApiProperty({
    type: EtapaAtualResumo,
    nullable: true,
    description:
      'Posicao atual na linha, DERIVADA da ultima passagem. `null` = peca ' +
      'sem passagem registrada.',
  })
  etapaAtual: EtapaAtualResumo | null;
}
