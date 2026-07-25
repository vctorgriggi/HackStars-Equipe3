import { Checkpoint } from '../../checkpoints/domain/checkpoint';

import { Transformador } from '../../transformadors/domain/transformador';

import { ApiProperty } from '@nestjs/swagger';

export class EventoPassagem {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  observacao?: string | null;

  @ApiProperty({
    type: () => Checkpoint,
    nullable: false,
  })
  checkpoint: Checkpoint;

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
