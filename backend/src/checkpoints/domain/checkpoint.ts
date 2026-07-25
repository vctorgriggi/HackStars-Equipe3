import { ApiProperty } from '@nestjs/swagger';

export class Checkpoint {
  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  ordem: number;

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
