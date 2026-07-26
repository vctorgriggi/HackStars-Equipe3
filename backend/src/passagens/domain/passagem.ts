import { Conferencia } from '../../conferencias/domain/conferencia';
import { Exclude } from 'class-transformer';
import { Checkpoint } from '../../checkpoints/domain/checkpoint';

import { Transformador } from '../../transformadores/domain/transformador';

import { ApiProperty } from '@nestjs/swagger';

export class Passagem {
  @Exclude({ toPlainOnly: true })
  conferencia?: Conferencia | null;

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
