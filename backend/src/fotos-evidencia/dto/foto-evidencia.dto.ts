import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FotoEvidenciaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
