import {
  // decorators here

  IsString,
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateTransformadorDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  descricao?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  cliente: string;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  seq?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  pedido?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  patrimonio: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  numeroSerie: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
