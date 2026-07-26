import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindAllTransformadoresDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    example: '847233',
    description:
      'Chave de negocio da peca (casamento exato). A coluna e UNIQUE, entao ' +
      'devolve 0 ou 1 item — e o caminho de "li o QR, quero a peca".',
  })
  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @ApiPropertyOptional({
    example: '408136',
    description: 'Pedido/lote da peca (casamento exato).',
  })
  @IsOptional()
  @IsString()
  pedido?: string;
}
