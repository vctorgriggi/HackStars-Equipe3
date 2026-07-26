import { TransformUrlEvidencia } from '../domain/url-evidencia.transform';
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
    example: 'https://trael.s3.us-east-1.amazonaws.com/1e0f2c9d.png?X-Amz-...',
    description:
      'URL pronta para abrir: driver local → URL absoluta do backend; ' +
      'driver s3 → URL assinada (1h). Ver TransformUrlEvidencia.',
  })
  @TransformUrlEvidencia()
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
