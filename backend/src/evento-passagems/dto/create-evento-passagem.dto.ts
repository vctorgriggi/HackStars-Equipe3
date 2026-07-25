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
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateEventoPassagemDto {
  @ApiProperty({
    required: true,
    type: () => CheckpointDto,
  })
  @ValidateNested()
  @Type(() => CheckpointDto)
  @IsNotEmptyObject()
  checkpoint: CheckpointDto;

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
