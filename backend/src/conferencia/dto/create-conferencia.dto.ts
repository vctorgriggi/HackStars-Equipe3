import { CheckpointDto } from '../../checkpoints/dto/checkpoint.dto';

import { TransformadorDto } from '../../transformadors/dto/transformador.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateConferenciaDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  observacao?: string | null;

  // vereditoGeral fica fora do DTO de propósito: só a engine grava veredito.

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
    required: true,
    type: () => TransformadorDto,
  })
  @ValidateNested()
  @Type(() => TransformadorDto)
  @IsNotEmptyObject()
  transformador: TransformadorDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
