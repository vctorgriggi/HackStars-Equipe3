import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ArrayNotEmpty,
  IsArray,
  IsIn,
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

  /**
   * Canal pelo qual a corroboracao por recorte (feita no adapter de visao)
   * chega a engine: o fluxo com fotos monta ESTE dto a partir de
   * `LeituraExtraida`. Sem o campo aqui, a segunda evidencia se perderia no
   * caminho e a leitura chegaria a engine como se ninguem a tivesse conferido.
   *
   * FORJAVEL pelo cliente HTTP, como `confianca` (gap 10 do CLAUDE.md) — e
   * inofensivo na direcao que importa: `confirmada` no maximo LIBERA um
   * `divergente` (acusacao), nunca produz `conforme`. Alem disso, campo de
   * relevo que chega SEM este dado e tratado como `nao-confirmada` pela
   * execucao, entao omitir tambem nao afrouxa nada.
   */
  @ApiProperty({
    required: false,
    enum: ['confirmada', 'nao-confirmada'],
    description:
      'Corroboracao da leitura por releitura de recorte (so marcacao em relevo)',
  })
  @IsOptional()
  @IsIn(['confirmada', 'nao-confirmada'])
  corroboracao?: 'confirmada' | 'nao-confirmada';
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
