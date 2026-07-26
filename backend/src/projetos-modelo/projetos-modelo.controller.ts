import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ProjetosModeloService } from './projetos-modelo.service';
import { ProjetosModeloConsultasService } from './consultas/projetos-modelo-consultas.service';
import { ProjetoModeloComContadores } from './consultas/projeto-modelo-com-contadores';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ProjetoModelo } from './domain/projeto-modelo';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllProjetosModeloDto } from './dto/find-all-projetos-modelo.dto';

@ApiTags('Projetos modelo')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'projetos-modelo',
  version: '1',
})
export class ProjetosModeloController {
  constructor(
    private readonly projetosModeloService: ProjetosModeloService,
    private readonly projetosModeloConsultasService: ProjetosModeloConsultasService,
  ) {}

  // ESCRITA DESATIVADA (auditoria de superfície, 2026-07-25). A checklist
  // deste registro É a norma que a engine consome: com PATCH aberto, remover
  // `serie-placa` fazia o cenário-âncora (peça defeituosa) responder
  // `conforme` — o falso OK que a regra de ouro proíbe, emitido pela própria
  // API; e `checklist: "[]"` derrubava toda conferência em 500. POST também
  // saiu: um segundo projeto quebra a resolução "único do banco" e todo scan
  // de peça nova vira 422 `projeto-modelo-indeterminado`.
  // Nesta rodada a ÚNICA escrita legítima é o seed. A ingestão de projeto
  // (Fase 6) reabre a criação pela tela de revisão, não por CRUD cru.
  //
  // @Post()
  // create(@Body() createProjetoModeloDto: CreateProjetoModeloDto) {
  //   return this.projetosModeloService.create(createProjetoModeloDto);
  // }

  @Get()
  @ApiOperation({
    summary:
      'Lista projetos com contadores derivados no servidor: peças ' +
      'vinculadas e itens da checklist (total e por etapa)',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(ProjetoModeloComContadores),
  })
  async findAll(
    @Query() query: FindAllProjetosModeloDto,
  ): Promise<InfinityPaginationResponseDto<ProjetoModeloComContadores>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.projetosModeloConsultasService.listarComContadores({
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
    type: ProjetoModelo,
  })
  findById(@Param('id') id: string) {
    return this.projetosModeloService.findById(id);
  }

  // @Patch(':id') e @Delete(':id') desativados pelo mesmo motivo do @Post()
  // acima: a checklist é a norma contra a qual as peças são julgadas, e
  // editá-la por CRUD cru falsifica o veredito de todas as conferências do
  // modelo. Leitura (GET) segue aberta — a página /demo a usa para saber
  // quantas posições chumbadas o modelo exige.
}
