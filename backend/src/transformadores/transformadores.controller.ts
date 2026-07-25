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
import { CreateTransformadorDto } from './dto/create-transformador.dto';
import { UpdateTransformadorDto } from './dto/update-transformador.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
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
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: Transformador,
  })
  create(@Body() createTransformadorDto: CreateTransformadorDto) {
    return this.transformadoresService.create(createTransformadorDto);
  }

  @Get()
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
