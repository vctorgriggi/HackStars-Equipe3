import { FotoEvidencia } from '../../foto-evidencia/domain/foto-evidencia';
import { Exclude } from 'class-transformer';
import { Conferencia } from '../../conferencia/domain/conferencia';

import { ApiProperty } from '@nestjs/swagger';

export class CampoConferido {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  regiaoLeitura?: string | null;

  @ApiProperty({
    type: () => FotoEvidencia,
    nullable: true,
  })
  fotoEvidencia?: FotoEvidencia | null;

  @Exclude({ toPlainOnly: true })
  veredito?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  confianca?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  valorLido?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  valorEsperado: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  nomeCampo: string;

  @ApiProperty({
    type: () => Conferencia,
    nullable: false,
  })
  conferencia: Conferencia;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
