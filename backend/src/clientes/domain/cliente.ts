import { ApiProperty } from '@nestjs/swagger';

export class Cliente {
  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  nome: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
