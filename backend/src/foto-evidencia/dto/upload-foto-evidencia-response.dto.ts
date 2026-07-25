import { ApiProperty } from '@nestjs/swagger';
import { FonteFisicaEnum } from '../fonte-fisica.enum';

export class UploadFotoEvidenciaResponseDto {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '/api/v1/files/1e0f2c9d6d3f4a1b.png',
    description:
      'Driver local: caminho relativo ao backend (BACKEND_DOMAIN + url ' +
      'responde 200 em GET, sem autenticação). Driver s3: chave do objeto ' +
      'no bucket, resolvida em URL assinada pelo módulo de files.',
  })
  url: string;

  @ApiProperty({
    enum: FonteFisicaEnum,
    enumName: 'FonteFisicaEnum',
    example: FonteFisicaEnum.placa,
  })
  fonteFisica: FonteFisicaEnum;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
  })
  conferenciaId: string | null;
}
