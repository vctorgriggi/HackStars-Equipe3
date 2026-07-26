import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class LeituraCampoDto {
  @ApiProperty({
    required: true,
    type: () => String,
    example: 'serie-placa',
    description: 'Nome do campo do checklist (ProjetoModelo.checklist[].campo)',
  })
  @IsString()
  campo: string;

  @ApiProperty({
    required: false,
    type: () => String,
    nullable: true,
    description: 'Valor extraido da foto/OCR; null quando nao houve leitura',
  })
  @IsOptional()
  @IsString()
  valorLido?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
    nullable: true,
    minimum: 0,
    maximum: 1,
    description: 'Score 0..1 da extracao',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confianca?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
    nullable: true,
    description: 'Regiao da imagem de onde o valor foi lido (rastreabilidade)',
  })
  @IsOptional()
  @IsString()
  regiaoLeitura?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
    nullable: true,
    description: 'Id de FotoEvidencia ja gravada; ignorado se nao existir',
  })
  @IsOptional()
  @IsString()
  fotoEvidenciaId?: string | null;
}

export class ExecutarConferenciaDto {
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
    description: 'Limiar de confianca da engine; ausente usa o padrao (0.9)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  limiarConfianca?: number;

  @ApiProperty({
    required: true,
    type: () => [LeituraCampoDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LeituraCampoDto)
  leituras: LeituraCampoDto[];

  // veredito fica fora do DTO de proposito: so a engine grava veredito.
}
