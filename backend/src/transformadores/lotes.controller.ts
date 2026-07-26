import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';

import { LoteResumo } from './consultas/lote-resumo';
import { LotesConsultasService } from './consultas/lotes-consultas.service';
import { FindAllLotesDto } from './dto/find-all-lotes.dto';

/**
 * Vive no modulo `transformadores` porque lote nao e entidade: e leitura
 * agregada das pecas pelo `pedido`. So GET — nao ha o que escrever num
 * recorte.
 */
@ApiTags('Lotes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lotes',
  version: '1',
})
export class LotesController {
  constructor(private readonly lotesConsultasService: LotesConsultasService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista lotes (pecas agrupadas por pedido) com resumo derivado no ' +
      'servidor: contadores de conformidade e progresso de transito',
    description:
      'Lote = o `pedido` da identidade da peca; peca sem pedido nao forma ' +
      'lote. Pagina de pedidos distintos, do lote com atividade mais ' +
      'recente para o mais antigo. `pecasDivergentes` le o veredito ' +
      'VIGENTE como a engine gravou (gap 14: gate parcial nao atesta a ' +
      'peca inteira) e `progressoPct` e posicao na esteira, nao atestado ' +
      'de conformidade.',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(LoteResumo),
  })
  async findAll(
    @Query() query: FindAllLotesDto,
  ): Promise<InfinityPaginationResponseDto<LoteResumo>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lotesConsultasService.listarResumos({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }
}
