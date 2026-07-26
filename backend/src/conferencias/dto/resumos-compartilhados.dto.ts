import { ApiProperty } from '@nestjs/swagger';

/**
 * Projeções de LEITURA que aparecem em mais de uma resposta de domínio
 * (conferência, passagem, histórico). Existem como CLASSE porque o Swagger só
 * documenta classes — interface some na compilação e o front receberia rota
 * sem schema de resposta.
 *
 * Ficam num arquivo só, e não uma cópia por módulo, porque nome de schema é
 * global no documento OpenAPI: três `TransformadorResumo` diferentes virariam
 * três schemas quase iguais para o front escolher. O arquivo não importa nada
 * além do Swagger — é folha, sem risco de ciclo com quem o consome.
 */

export class CheckpointResumo {
  @ApiProperty({
    type: String,
    example: 'fixacao-placa',
    description:
      'Identificador ESTÁVEL da etapa (slug). É por ele que gates e regras ' +
      'casam — nunca pelo nome exibido nem pela ordem, que mudam.',
  })
  codigo: string;

  @ApiProperty({
    type: String,
    example: 'Fixação da placa de identificação',
    description: 'Nome exibível da etapa; só para a tela.',
  })
  nome: string;
}

export class EtapaResumo extends CheckpointResumo {
  @ApiProperty({
    type: Number,
    example: 4,
    description:
      'Posição da etapa na linha (1 = adesivação … 4 = fixação da placa). ' +
      'Define o recorte CUMULATIVO da checklist: a etapa N confere o que ela ' +
      'e as anteriores gravaram na peça.',
  })
  ordem: number;
}

export class TransformadorResumo {
  @ApiProperty({
    type: String,
    example: '3f6d1b2e-9c4a-4f5b-8a7d-2e1c0b9a8f7e',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '847233',
    description:
      'Chave de negócio da peça (série do fabricante, chumbada 3× no metal). ' +
      'É por ela que o find-or-create resolve a peça a partir do QR.',
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
    example: '251328',
    description:
      'Numeração do CLIENTE: única por cliente, não globalmente — nunca serve ' +
      'de chave para localizar a peça.',
  })
  patrimonio: string;

  @ApiProperty({
    type: String,
    example: 'ENERGISA',
    description:
      'Cliente como texto do QR (string livre nesta rodada; vira entidade na ' +
      'rodada de ERP). String vazia quando a etiqueta não traz o dado.',
  })
  cliente: string;
}
