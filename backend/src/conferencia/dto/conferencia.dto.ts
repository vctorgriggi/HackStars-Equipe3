import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConferenciaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
