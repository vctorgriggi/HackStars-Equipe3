import { TransformUrlEvidencia } from './url-evidencia.transform';
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
    nullable: false,
  })
  fonteFisica: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  @TransformUrlEvidencia()
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
