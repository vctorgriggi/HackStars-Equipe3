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
import { CamerasService } from './cameras.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Camera } from './domain/camera';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCamerasDto } from './dto/find-all-cameras.dto';

// CRUD aberto a qualquer JWT, mesmo status de checkpoints (gap 1 do
// CLAUDE.md: sem RolesGuard até a rodada de produção). Cadastro é dado de
// provisionamento — não participa de veredito nem de leitura de visão.
@ApiTags('Câmeras')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'cameras',
  version: '1',
})
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cadastra uma câmera fixa, opcionalmente já vinculada a um gate ' +
      '(checkpoint) e sempre com a vista (fonteFisica) que ela enxerga',
  })
  @ApiCreatedResponse({
    type: Camera,
  })
  create(@Body() createCameraDto: CreateCameraDto) {
    return this.camerasService.create(createCameraDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as câmeras cadastradas (paginado, teto 50 por página)',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(Camera),
  })
  async findAll(
    @Query() query: FindAllCamerasDto,
  ): Promise<InfinityPaginationResponseDto<Camera>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.camerasService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Uma câmera pelo id — id inexistente devolve 200 com corpo vazio ' +
      '(comportamento do CRUD gerado), não 404',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Camera,
  })
  findById(@Param('id') id: string) {
    return this.camerasService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualiza o cadastro (vínculo de gate, vista, ativa, endpoint) — ' +
      '`checkpoint: null` remove o vínculo',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Camera,
  })
  update(@Param('id') id: string, @Body() updateCameraDto: UpdateCameraDto) {
    return this.camerasService.update(id, updateCameraDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove a câmera (hard delete; câmera é folha, sem filhos)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }
}
