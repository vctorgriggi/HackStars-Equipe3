import {
  // decorators here
  IsNotEmpty,
  IsString,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

/**
 * Reinicio de apresentacao (ferramenta de demo): recoloca a peca no PRIMEIRO
 * checkpoint da linha, apagando o historico de transito dela. A peca e
 * resolvida pela chave de negocio (`numeroSerie`) — peca desconhecida e 404,
 * nunca find-or-create: reset nao cria peca.
 */
export class ReiniciarApresentacaoDto {
  @ApiProperty({
    required: true,
    type: () => String,
    example: '847233',
    description:
      'Numero de serie da peca a reposicionar (chave de negocio, unica do ' +
      'fabricante).',
  })
  @IsString()
  @IsNotEmpty()
  numeroSerie: string;
}
