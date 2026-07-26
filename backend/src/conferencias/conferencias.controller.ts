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
import { ConferenciasService } from './conferencias.service';
import { ConferenciaConsultasService } from './consultas/conferencia-consultas.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { CreateConferenciaDto } from './dto/create-conferencia.dto';
import { ExecutarComFotosDto } from './dto/executar-com-fotos.dto';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';
import { UpdateConferenciaDto } from './dto/update-conferencia.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Conferencia } from './domain/conferencia';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllConferenciasDto } from './dto/find-all-conferencias.dto';

@ApiTags('Conferências')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'conferencias',
  version: '1',
})
export class ConferenciasController {
  constructor(
    private readonly conferenciasService: ConferenciasService,
    private readonly conferenciaExecucaoService: ConferenciaExecucaoService,
    private readonly conferenciaExtracaoService: ConferenciaExtracaoService,
    private readonly conferenciaConsultasService: ConferenciaConsultasService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: Conferencia,
  })
  create(@Body() createConferenciaDto: CreateConferenciaDto) {
    return this.conferenciasService.create(createConferenciaDto);
  }

  @Post('executar')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description:
      'Conferencia executada: peca (find-or-create pelo numero de serie), ' +
      'veredito geral calculado pela engine e um CampoConferido por campo ' +
      'do checklist avaliado. A resposta traz tambem `incoerencias`: grupos ' +
      'de campos irmaos (mesmo valor esperado do QR — as series chumbadas e a ' +
      'da placa, os patrimonios entre si) que leram valores DIFERENTES entre ' +
      'si, cada um com campo, valor lido, confianca e veredito. Incoerencia ' +
      'so REBAIXA: impede o `conforme` geral e nunca suaviza um `divergente`.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'payloadQr ilegivel/somente-codigo, etapa-desconhecida, ' +
      'projeto-modelo-indeterminado ou etapa-sem-campos-conferiveis. ' +
      'Todos saem antes da primeira escrita: 422 nunca deixa peca orfa.',
  })
  executar(@Body() executarConferenciaDto: ExecutarConferenciaDto) {
    return this.conferenciaExecucaoService.executar(executarConferenciaDto);
  }

  @Post('executar-com-fotos')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description:
      'Mesma conferencia do POST /executar, mas as leituras vem da VISAO: ' +
      'so as fotos cuja fonte fisica tem campo no recorte da etapa sao lidas ' +
      'do storage e enviadas uma unica vez ao extrator ativo ' +
      '(EXTRACTOR_DRIVER). Vale tambem aqui o `incoerencias` do /executar. ' +
      'A resposta acrescenta `extracao` (driver, fotos, ' +
      'leiturasProduzidas, fotosForaDoRecorte, achadosLivres) e ' +
      '`achadosInconsistentes`: textos com cara de identificador que a visao ' +
      'leu na peca e o QR nao conhece. Esse ultimo e ALARME informativo — ' +
      'nao entra no vereditoGeral nem em campo nenhum, e nao e persistido ' +
      'nesta rodada. As fotos usadas ficam vinculadas a conferencia criada, ' +
      'e o veredito continua nascendo na engine.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'payloadQr ilegivel/somente-codigo, etapa-desconhecida, ' +
      'projeto-modelo-indeterminado, etapa-sem-campos-conferiveis, ' +
      'foto-evidencia-inexistente ou foto-evidencia-de-outra-conferencia. ' +
      'Todos sao avaliados ANTES de qualquer chamada paga de visao.',
  })
  executarComFotos(@Body() executarComFotosDto: ExecutarComFotosDto) {
    return this.conferenciaExtracaoService.executarComFotos(
      executarComFotosDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Conferencia),
  })
  async findAll(
    @Query() query: FindAllConferenciasDto,
  ): Promise<InfinityPaginationResponseDto<Conferencia>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.conferenciasService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id/campos')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'Releitura do veredito campo a campo, com as evidencias',
    description:
      'Remonta a tela de veredito SEM a resposta do POST: refresh, navegacao ' +
      'entre telas (fotos numa, veredito noutra) ou abertura pelo historico ' +
      'da peca reconstroem tudo daqui. Cada campo vem com sua foto-evidencia ' +
      '(criterio 1 do SPEC). O veredito chega como a engine gravou — o front ' +
      'nao recalcula nada.\n\n' +
      'ATENCAO 1 — `fotoEvidencia.url` sob `FILE_DRIVER=s3` e uma URL ASSINADA ' +
      'que EXPIRA EM 1 HORA. Nao persista essa URL em store de longa duracao ' +
      'no cliente: apos a expiracao ela devolve 403 e a evidencia some da ' +
      'tela. Recarregue esta rota para obter um link novo.\n\n' +
      'ATENCAO 2 — o que a releitura NAO devolve, porque nao e persistido ' +
      'nesta rodada: (a) `motivo` do campo (`sem-leitura`, ' +
      '`confianca-abaixo-do-limiar`, `leituras-conflitantes`, ' +
      '`leitura-de-outro-campo`, `leitura-nao-corroborada`) — o VEREDITO esta ' +
      'gravado, o porque dele so existe na resposta do POST; (b) ' +
      '`incoerencias` entre campos irmaos; (c) `achadosInconsistentes` da ' +
      'extracao. O efeito de (b) sobre o `vereditoGeral` esta gravado, mas o ' +
      'detalhe e efemero.\n\n' +
      '`fonteFisica` e `obrigatorio` de cada campo sao RE-RESOLVIDOS da ' +
      'checklist do ProjetoModelo da peca (CampoConferido nao os persiste) e ' +
      'vem `null` se a peca nao tiver projeto vinculado.',
  })
  @ApiNotFoundResponse({ description: 'conferencia-inexistente' })
  vereditoPorConferencia(@Param('id') id: string) {
    return this.conferenciaConsultasService.vereditoPorConferencia(id);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conferencia,
  })
  findById(@Param('id') id: string) {
    return this.conferenciasService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conferencia,
  })
  update(
    @Param('id') id: string,
    @Body() updateConferenciaDto: UpdateConferenciaDto,
  ) {
    return this.conferenciasService.update(id, updateConferenciaDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.conferenciasService.remove(id);
  }
}
