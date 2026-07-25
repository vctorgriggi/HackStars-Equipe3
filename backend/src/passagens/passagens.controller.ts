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
import { PassagensService } from './passagens.service';
import { CreatePassagemDto } from './dto/create-passagem.dto';
import { UpdatePassagemDto } from './dto/update-passagem.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Passagem } from './domain/passagem';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllPassagensDto } from './dto/find-all-passagens.dto';

@ApiTags('Passagens')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'passagens',
  version: '1',
})
export class PassagensController {
  constructor(private readonly passagensService: PassagensService) {}

  @Post()
  @ApiCreatedResponse({
    type: Passagem,
  })
  create(@Body() createPassagemDto: CreatePassagemDto) {
    return this.passagensService.create(createPassagemDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Passagem),
  })
  async findAll(
    @Query() query: FindAllPassagensDto,
  ): Promise<InfinityPaginationResponseDto<Passagem>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.passagensService.findAllWithPagination({
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
    type: Passagem,
  })
  findById(@Param('id') id: string) {
    return this.passagensService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Passagem,
  })
  update(
    @Param('id') id: string,
    @Body() updatePassagemDto: UpdatePassagemDto,
  ) {
    return this.passagensService.update(id, updatePassagemDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.passagensService.remove(id);
  }
}
