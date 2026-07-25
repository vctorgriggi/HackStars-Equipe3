import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

import {
  // decorators here
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Teto de fotos por conferencia. Cada foto e UMA chamada paga de visao
 * (SPEC, constraint 4) — o limite vive no contrato, explicito, e nao escondido
 * dentro do servico. 10 cobre a peca de demo (placa + serigrafia + 3
 * chumbados) com folga para refoto.
 */
export const MAX_FOTOS_POR_CONFERENCIA = 10;

export class ExecutarComFotosDto {
  @ApiProperty({
    required: true,
    type: () => String,
    description: 'Conteudo bruto lido do QR da etiqueta',
  })
  @IsString()
  @IsNotEmpty()
  payloadQr: string;

  @ApiProperty({
    required: false,
    type: () => String,
    example: 'fixacao-placa',
    description: 'Codigo (slug) do Checkpoint da etapa; opcional',
  })
  @IsOptional()
  @IsString()
  etapaCodigo?: string;

  @ApiProperty({
    required: false,
    type: () => Number,
    minimum: 0,
    maximum: 1,
    description: 'Limiar de confianca da engine; ausente usa o padrao (0.8)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  limiarConfianca?: number;

  @ApiProperty({
    required: true,
    type: () => [String],
    format: 'uuid',
    maxItems: MAX_FOTOS_POR_CONFERENCIA,
    description:
      'Ids de FotoEvidencia ja enviadas (POST /foto-evidencia/upload). ' +
      'A fonte fisica de cada foto vem do proprio registro; ' +
      `maximo ${MAX_FOTOS_POR_CONFERENCIA} — cada foto e uma chamada paga ` +
      'de visao.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_FOTOS_POR_CONFERENCIA)
  // Sem fixar versao: o id vem do banco, e recusar um uuid valido de outra
  // versao seria 400 em foto que existe.
  @IsUUID(undefined, { each: true })
  fotoEvidenciaIds: string[];

  // leituras NAO entram aqui de proposito: neste endpoint quem produz leitura
  // e a visao, e o veredito continua nascendo na engine (regra de ouro).
}
