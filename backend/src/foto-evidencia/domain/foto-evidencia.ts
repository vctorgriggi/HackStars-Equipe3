import { Conferencia } from '../../conferencia/domain/conferencia';

import { ApiProperty } from '@nestjs/swagger';

export class FotoEvidencia {
  @ApiProperty({
    type: () => Conferencia,
    nullable: true,
  })
  conferencia?: Conferencia | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  fonteFisica?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  url: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
