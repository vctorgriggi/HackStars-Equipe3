import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EventoPassagemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
