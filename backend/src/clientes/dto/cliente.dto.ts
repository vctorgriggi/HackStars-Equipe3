import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClienteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
