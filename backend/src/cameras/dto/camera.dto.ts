import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CameraDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
