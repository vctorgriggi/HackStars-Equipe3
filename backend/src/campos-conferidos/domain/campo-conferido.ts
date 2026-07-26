import { FotoEvidencia } from '../../fotos-evidencia/domain/foto-evidencia';
import { Conferencia } from '../../conferencias/domain/conferencia';

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

  // Gravado só pela engine (nunca via DTO); legível em toda resposta.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
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
