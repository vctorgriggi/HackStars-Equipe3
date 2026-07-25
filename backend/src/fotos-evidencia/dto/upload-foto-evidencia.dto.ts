import {
  // decorators here
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  // decorators here
  Transform,
} from 'class-transformer';

import { FonteFisicaEnum } from '../fonte-fisica.enum';

// Campos de texto do multipart/form-data que acompanham o arquivo.
export class UploadFotoEvidenciaDto {
  @ApiProperty({
    required: true,
    enum: FonteFisicaEnum,
    enumName: 'FonteFisicaEnum',
    example: FonteFisicaEnum.placa,
  })
  @IsEnum(FonteFisicaEnum)
  fonteFisica: FonteFisicaEnum;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    example: '69004269-b3ca-43c0-bf94-a9bcabb9e4fb',
  })
  // Campo de texto em multipart chega como string: '' equivale a ausente.
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUUID()
  conferenciaId?: string;
}
