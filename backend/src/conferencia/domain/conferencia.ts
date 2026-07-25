import { Exclude } from 'class-transformer';
import { Checkpoint } from '../../checkpoints/domain/checkpoint';

import { Transformador } from '../../transformadors/domain/transformador';

import { ApiProperty } from '@nestjs/swagger';

export class Conferencia {
  @Exclude({ toPlainOnly: true })
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
