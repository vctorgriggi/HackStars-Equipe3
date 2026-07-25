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
import { ProjetoModelosService } from './projeto-modelos.service';
import { CreateProjetoModeloDto } from './dto/create-projeto-modelo.dto';
import { UpdateProjetoModeloDto } from './dto/update-projeto-modelo.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
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
import { FindAllProjetoModelosDto } from './dto/find-all-projeto-modelos.dto';

@ApiTags('Projetomodelos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'projeto-modelos',
  version: '1',
})
export class ProjetoModelosController {
  constructor(private readonly projetoModelosService: ProjetoModelosService) {}

  @Post()
  @ApiCreatedResponse({
    type: ProjetoModelo,
  })
  create(@Body() createProjetoModeloDto: CreateProjetoModeloDto) {
    return this.projetoModelosService.create(createProjetoModeloDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ProjetoModelo),
  })
  async findAll(
    @Query() query: FindAllProjetoModelosDto,
  ): Promise<InfinityPaginationResponseDto<ProjetoModelo>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.projetoModelosService.findAllWithPagination({
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
    return this.projetoModelosService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ProjetoModelo,
  })
  update(
    @Param('id') id: string,
    @Body() updateProjetoModeloDto: UpdateProjetoModeloDto,
  ) {
    return this.projetoModelosService.update(id, updateProjetoModeloDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.projetoModelosService.remove(id);
  }
}
