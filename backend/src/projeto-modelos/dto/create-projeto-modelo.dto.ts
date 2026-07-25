import {
  // decorators here

  IsString,
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateProjetoModeloDto {
  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  checklist: string;

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
  codigo: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
