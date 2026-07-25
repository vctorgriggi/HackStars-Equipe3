import { ApiProperty } from '@nestjs/swagger';

export class ProjetoModelo {
  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  checklist: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  descricao?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  codigo: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
