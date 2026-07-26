import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Cliente } from './domain/cliente';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllClientesDto } from './dto/find-all-clientes.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'clientes',
  version: '1',
})
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // ESCRITA DESATIVADA (mesmo padrão de projetos-modelo, T2.9). O cadastro
  // nasce exclusivamente do find-or-create server-side quando a identidade da
  // peça chega com cliente (ClientesService.buscarOuCriarPorNome): CRUD cru
  // permitiria renomear/apagar um cliente já vinculado e dessincronizar o
  // cadastro do texto do QR, que segue sendo a fonte da verdade. Leitura
  // (GET) fica aberta para a futura tela de clientes.
  //
  // @Post() create, @Patch(':id') update e @Delete(':id') remove ficam no
  // service para o caminho server-side; reabrir só com RolesGuard (pós-demo).

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Cliente),
  })
  async findAll(
    @Query() query: FindAllClientesDto,
  ): Promise<InfinityPaginationResponseDto<Cliente>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.clientesService.findAllWithPagination({
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
    type: Cliente,
  })
  findById(@Param('id') id: string) {
    return this.clientesService.findById(id);
  }
}
