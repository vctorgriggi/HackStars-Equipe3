import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CamposConferidosService } from './campos-conferidos.service';
import { UpdateCampoConferidoDto } from './dto/update-campo-conferido.dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CampoConferido } from './domain/campo-conferido';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCamposConferidosDto } from './dto/find-all-campos-conferidos.dto';

@ApiTags('Campos conferidos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'campos-conferidos',
  version: '1',
})
export class CamposConferidosController {
  constructor(
    private readonly camposConferidosService: CamposConferidosService,
  ) {}

  // ESCRITA DESATIVADA (auditoria de superfície, 2026-07-25). Já existia UM
  // caminho de escrita de veredito (`criarComVeredito`, server-side); este
  // POST era uma porta paralela que gravava campo sem passar pela engine.
  //
  // @Post()
  // create(@Body() createCampoConferidoDto: CreateCampoConferidoDto) {
  //   return this.camposConferidosService.create(createCampoConferidoDto);
  // }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CampoConferido),
  })
  async findAll(
    @Query() query: FindAllCamposConferidosDto,
  ): Promise<InfinityPaginationResponseDto<CampoConferido>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.camposConferidosService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CampoConferido,
  })
  findById(@Param('id') id: string) {
    return this.camposConferidosService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CampoConferido,
  })
  update(
    @Param('id') id: string,
    @Body() updateCampoConferidoDto: UpdateCampoConferidoDto,
  ) {
    return this.camposConferidosService.update(id, updateCampoConferidoDto);
  }

  // DELETE DESATIVADO (auditoria de superfície, 2026-07-25). O PATCH já
  // devolvia 422 `campo-conferido-imutavel`, mas o DELETE continuava 200:
  // apagar o único campo `divergente` deixava a conferência com
  // `vereditoGeral: divergente` e nenhum campo divergente — lastro corrompido
  // em silêncio. Imutabilidade que não cobre remoção não é imutabilidade.
  //
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.camposConferidosService.remove(id);
  // }
}
