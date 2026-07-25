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
import { EventoPassagemsService } from './evento-passagems.service';
import { CreateEventoPassagemDto } from './dto/create-evento-passagem.dto';
import { UpdateEventoPassagemDto } from './dto/update-evento-passagem.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { EventoPassagem } from './domain/evento-passagem';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllEventoPassagemsDto } from './dto/find-all-evento-passagems.dto';

@ApiTags('Eventopassagems')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'evento-passagems',
  version: '1',
})
export class EventoPassagemsController {
  constructor(
    private readonly eventoPassagemsService: EventoPassagemsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: EventoPassagem,
  })
  create(@Body() createEventoPassagemDto: CreateEventoPassagemDto) {
    return this.eventoPassagemsService.create(createEventoPassagemDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(EventoPassagem),
  })
  async findAll(
    @Query() query: FindAllEventoPassagemsDto,
  ): Promise<InfinityPaginationResponseDto<EventoPassagem>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.eventoPassagemsService.findAllWithPagination({
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
    type: EventoPassagem,
  })
  findById(@Param('id') id: string) {
    return this.eventoPassagemsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: EventoPassagem,
  })
  update(
    @Param('id') id: string,
    @Body() updateEventoPassagemDto: UpdateEventoPassagemDto,
  ) {
    return this.eventoPassagemsService.update(id, updateEventoPassagemDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.eventoPassagemsService.remove(id);
  }
}
