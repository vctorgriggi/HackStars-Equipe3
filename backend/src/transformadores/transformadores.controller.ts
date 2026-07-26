import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TransformadoresService } from './transformadores.service';
import { TransformadorConsultasService } from './consultas/transformador-consultas.service';
import { CreateTransformadorDto } from './dto/create-transformador.dto';
import { UpdateTransformadorDto } from './dto/update-transformador.dto';
import {
  HistoricoConferenciasDto,
  HistoricoPassagensDto,
} from './dto/historico-transformador.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Transformador } from './domain/transformador';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllTransformadoresDto } from './dto/find-all-transformadores.dto';

@ApiTags('Transformadores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'transformadores',
  version: '1',
})
export class TransformadoresController {
  constructor(
    private readonly transformadoresService: TransformadoresService,
    private readonly transformadorConsultasService: TransformadorConsultasService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: Transformador,
  })
  create(@Body() createTransformadorDto: CreateTransformadorDto) {
    return this.transformadoresService.create(createTransformadorDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista pecas, opcionalmente filtradas',
    description:
      'Sem filtro, pagina o cadastro inteiro (comportamento historico). ' +
      '`numeroSerie` e a chave de negocio e devolve 0 ou 1 item — e como o ' +
      'front resolve "li o QR, quero a peca". `pedido` recorta o lote.',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(Transformador),
  })
  async findAll(
    @Query() query: FindAllTransformadoresDto,
  ): Promise<InfinityPaginationResponseDto<Transformador>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.transformadoresService.findAllWithPagination({
        filterOptions: {
          numeroSerie: query?.numeroSerie,
          pedido: query?.pedido,
        },
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id/passagens')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'Historico de transito da peca, em ordem cronologica',
    description:
      'Eventos de passagem por checkpoint, do mais antigo para o mais ' +
      'recente (criterio 5 do SPEC). Scans repetidos na mesma etapa aparecem ' +
      'como eventos distintos e ordenados.',
  })
  @ApiNotFoundResponse({ description: 'transformador-inexistente' })
  async historicoDePassagens(
    @Param('id') id: string,
    @Query() query: HistoricoPassagensDto,
  ) {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.transformadorConsultasService.historicoDePassagens({
        transformadorId: id,
        paginationOptions: { page, limit },
      }),
      { page, limit },
    );
  }

  @Get(':id/conferencias')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'Conferencias da peca, da mais recente para a mais antiga',
    description:
      'Fonte do alerta de divergencia FORA da tela de veredito: a primeira ' +
      'da lista e o veredito vigente. O veredito vem do banco como a engine ' +
      'gravou — o front nao recalcula nada. `checkpoint` diz em que etapa o ' +
      'veredito saiu: conferencia parcial de gate nao atesta a peca inteira.',
  })
  @ApiNotFoundResponse({ description: 'transformador-inexistente' })
  historicoDeConferencias(
    @Param('id') id: string,
    @Query() query: HistoricoConferenciasDto,
  ) {
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return this.transformadorConsultasService.historicoDeConferencias({
      transformadorId: id,
      limit,
    });
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Transformador,
  })
  findById(@Param('id') id: string) {
    return this.transformadoresService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Transformador,
  })
  update(
    @Param('id') id: string,
    @Body() updateTransformadorDto: UpdateTransformadorDto,
  ) {
    return this.transformadoresService.update(id, updateTransformadorDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.transformadoresService.remove(id);
  }
}
