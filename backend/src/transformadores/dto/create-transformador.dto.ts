import { ClienteDto } from '../../clientes/dto/cliente.dto';

import { ProjetoModeloDto } from '../../projetos-modelo/dto/projeto-modelo.dto';

import {
  // decorators here

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

export class CreateTransformadorDto {
  clienteVinculado?: ClienteDto | null;

  @ApiProperty({
    required: false,
    type: () => ProjetoModeloDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjetoModeloDto)
  @IsNotEmptyObject()
  projetoModelo?: ProjetoModeloDto | null;

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
