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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PassagensService } from './passagens.service';
import { PassagemRegistroService } from './passagem-registro.service';
import { CreatePassagemDto } from './dto/create-passagem.dto';
import { RegistrarPassagemDto } from './dto/registrar-passagem.dto';
import { UpdatePassagemDto } from './dto/update-passagem.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
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
  constructor(
    private readonly passagensService: PassagensService,
    private readonly passagemRegistroService: PassagemRegistroService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: Passagem,
  })
  create(@Body() createPassagemDto: CreatePassagemDto) {
    return this.passagensService.create(createPassagemDto);
  }

  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra a passagem da peca por uma etapa, a partir do QR',
    description:
      'Caminho do operador: le o QR e informa a etapa em que o dispositivo ' +
      'esta fixado. A peca sai por find-or-create pelo numero de serie (o QR ' +
      'e a fonte da verdade: patrimonio/cliente/pedido divergentes atualizam ' +
      'o registro) e a etapa e resolvida pelo `codigo` do Checkpoint. A ' +
      'resposta traz `ultimaConferencia` — o ultimo veredito conhecido da ' +
      'peca, ou null se ela nunca foi conferida — para o alerta de ' +
      'divergencia aparecer no ato do scan. Scans repetidos na mesma etapa ' +
      'geram eventos distintos, de proposito: sao passagens reais.',
  })
  @ApiCreatedResponse({
    description:
      'Passagem criada: { passagem, checkpoint, transformador, ' +
      'ultimaConferencia }.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'payloadQr ilegivel/somente-codigo ou etapa-desconhecida. Os dois saem ' +
      'antes da primeira escrita: 422 nunca deixa peca orfa.',
  })
  registrar(@Body() registrarPassagemDto: RegistrarPassagemDto) {
    return this.passagemRegistroService.registrar(registrarPassagemDto);
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
