import { FONTES_FISICAS } from '../../extracao/ports/extractor.port';
import { ConferenciaDto } from '../../conferencia/dto/conferencia.dto';

import {
  // decorators here

  IsIn,
  IsString,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

import {
  // decorators here
  Type,
} from 'class-transformer';

export class CreateFotoEvidenciaDto {
  @ApiProperty({
    required: false,
    type: () => ConferenciaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConferenciaDto)
  @IsNotEmptyObject()
  conferencia?: ConferenciaDto | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  @IsIn(FONTES_FISICAS, {
    message: `fonteFisica must be one of the following values: ${FONTES_FISICAS.join(', ')}`,
  })
  fonteFisica: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  url: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
