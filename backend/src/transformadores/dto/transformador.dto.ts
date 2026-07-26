import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransformadorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
