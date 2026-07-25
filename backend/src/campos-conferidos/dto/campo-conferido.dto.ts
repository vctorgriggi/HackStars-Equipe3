import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CampoConferidoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
