import { FotoEvidenciaDto } from '../../foto-evidencia/dto/foto-evidencia.dto';

import { ConferenciaDto } from '../../conferencia/dto/conferencia.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCampoConferidoDto {
  @ApiProperty({
    required: false,
    type: () => FotoEvidenciaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FotoEvidenciaDto)
  @IsNotEmptyObject()
  fotoEvidencia?: FotoEvidenciaDto | null;

  veredito?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  confianca?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  valorLido?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  valorEsperado: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  nomeCampo: string;

  @ApiProperty({
    required: true,
    type: () => ConferenciaDto,
  })
  @ValidateNested()
  @Type(() => ConferenciaDto)
  @IsNotEmptyObject()
  conferencia: ConferenciaDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
