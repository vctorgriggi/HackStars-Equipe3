import { ProjetoModelo } from '../../projetos-modelo/domain/projeto-modelo';

import { ApiProperty } from '@nestjs/swagger';

export class Transformador {
  @ApiProperty({
    type: () => ProjetoModelo,
    nullable: true,
  })
  projetoModelo?: ProjetoModelo | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  descricao?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  cliente: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  seq?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  pedido?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  patrimonio: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
