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
import { CampoConferidosService } from './campo-conferidos.service';
import { CreateCampoConferidoDto } from './dto/create-campo-conferido.dto';
import { UpdateCampoConferidoDto } from './dto/update-campo-conferido.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { FindAllCampoConferidosDto } from './dto/find-all-campo-conferidos.dto';

@ApiTags('Campoconferidos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'campo-conferidos',
  version: '1',
})
export class CampoConferidosController {
  constructor(
    private readonly campoConferidosService: CampoConferidosService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CampoConferido,
  })
  create(@Body() createCampoConferidoDto: CreateCampoConferidoDto) {
    return this.campoConferidosService.create(createCampoConferidoDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CampoConferido),
  })
  async findAll(
    @Query() query: FindAllCampoConferidosDto,
  ): Promise<InfinityPaginationResponseDto<CampoConferido>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.campoConferidosService.findAllWithPagination({
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
    return this.campoConferidosService.findById(id);
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
    return this.campoConferidosService.update(id, updateCampoConferidoDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.campoConferidosService.remove(id);
  }
}
