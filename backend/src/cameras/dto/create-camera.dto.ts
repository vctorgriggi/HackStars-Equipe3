import { CheckpointDto } from '../../checkpoints/dto/checkpoint.dto';
import { FONTES_FISICAS } from '../../extracao/ports/extractor.port';

import {
  // decorators here

  IsIn,
  IsString,
  IsBoolean,
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

export class CreateCameraDto {
  @ApiProperty({
    required: false,
    type: () => CheckpointDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckpointDto)
  @IsNotEmptyObject()
  checkpoint?: CheckpointDto | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  endpoint?: string | null;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  ativa: boolean;

  @ApiProperty({
    required: true,
    type: () => String,
    enum: FONTES_FISICAS,
    example: 'topo',
    description:
      'VISTA da peça que o ponto de vista da câmera enxerga (whitelist ' +
      'canônica de fonteFisica — a mesma das fotos-evidência).',
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
  nome: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
