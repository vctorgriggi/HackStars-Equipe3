import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/** Query das passagens da peca (historico de transito, cronologico). */
export class HistoricoPassagensDto {
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
}

/** Query das conferencias da peca (mais recentes primeiro). */
export class HistoricoConferenciasDto {
  @ApiPropertyOptional({
    description:
      'Quantas conferencias trazer, da mais recente para a mais antiga. ' +
      'Default 10, teto 50. `limit=1` e o veredito vigente da peca.',
  })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;
}
