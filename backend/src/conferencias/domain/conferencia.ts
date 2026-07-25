import { Checkpoint } from '../../checkpoints/domain/checkpoint';

import { Transformador } from '../../transformadores/domain/transformador';

import { ApiProperty } from '@nestjs/swagger';

export class Conferencia {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  observacao?: string | null;

  // Gravado só pela engine (nunca via DTO); legível em toda resposta.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  vereditoGeral?: string | null;

  @ApiProperty({
    type: () => Checkpoint,
    nullable: true,
  })
  checkpoint?: Checkpoint | null;

  @ApiProperty({
    type: () => Transformador,
    nullable: false,
  })
  transformador: Transformador;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
