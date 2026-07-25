import {
  // decorators here

  IsString,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCheckpointDto {
  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  ordem: number;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  nome: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
