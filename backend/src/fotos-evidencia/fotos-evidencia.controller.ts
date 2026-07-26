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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FotosEvidenciaService } from './fotos-evidencia.service';
import { CreateFotoEvidenciaDto } from './dto/create-foto-evidencia.dto';
import { UpdateFotoEvidenciaDto } from './dto/update-foto-evidencia.dto';
import { UploadFotoEvidenciaDto } from './dto/upload-foto-evidencia.dto';
import { UploadFotoEvidenciaResponseDto } from './dto/upload-foto-evidencia-response.dto';
import { FonteFisicaEnum } from './fonte-fisica.enum';
import { imagemFileFilter } from './infrastructure/uploader/imagem-file-filter';
import { LimparUploadOrfaoInterceptor } from './infrastructure/uploader/limpar-upload-orfao.interceptor';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { FotoEvidencia } from './domain/foto-evidencia';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllFotosEvidenciaDto } from './dto/find-all-fotos-evidencia.dto';

@ApiTags('Fotos de evidência')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'fotos-evidencia',
  version: '1',
})
export class FotosEvidenciaController {
  constructor(private readonly fotosEvidenciaService: FotosEvidenciaService) {}

  @Post()
  @ApiOperation({
    summary: 'CRUD gerado: registra uma evidencia por URL (nao use no fluxo)',
    description:
      'Espera a URL de um arquivo que ja existe. O caminho do operador e ' +
      '`POST /fotos-evidencia/upload`, que sobe o arquivo e cria o registro ' +
      'em uma chamada.',
  })
  @ApiCreatedResponse({
    type: FotoEvidencia,
  })
  create(@Body() createFotoEvidenciaDto: CreateFotoEvidenciaDto) {
    return this.fotosEvidenciaService.create(createFotoEvidenciaDto);
  }

  // Upload da foto + criação da evidência em uma chamada (multipart).
  // Só o fileFilter é local; storage e tamanho máximo vêm do MulterModule do
  // driver ativo (FILE_DRIVER), reexportado pelo módulo de files.
  @Post('upload')
  @ApiOperation({
    summary: 'PASSO 1 do fluxo: sobe a foto da peca e cria a evidencia',
    description:
      'Multipart com o arquivo e a VISTA de onde ele foi tirado ' +
      '(`fonteFisica`). Guarde o `id` de cada foto: e ele que vai em ' +
      '`fotoEvidenciaIds` no `POST /conferencias/executar-com-fotos`. Nenhuma ' +
      'chamada de visao acontece aqui — so no disparo da conferencia. A `url` ' +
      'da resposta ja vem pronta para abrir, mas sob `FILE_DRIVER=s3` e ' +
      'ASSINADA E EXPIRA EM 1 HORA: nao a persista em store de longa duracao.',
  })
  @ApiCreatedResponse({
    type: UploadFotoEvidenciaResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description:
      '`fonteFisica` fora da whitelist canonica (as vistas `base`, `topo`, ' +
      '`frente`, `traseira`, `lateral-esquerda`, `lateral-direita`, os closes ' +
      '`placa` e `etiqueta` e o escape `geral`), arquivo ausente ' +
      '(`file: selectFile`), tipo de arquivo recusado pelo filtro de imagem ' +
      'ou `conferenciaId: notExists`. Grafia divergente de `fonteFisica` ' +
      'quebraria o pareamento campo ↔ evidencia, por isso e 422 e nao ' +
      'normalizacao silenciosa.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fonteFisica'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fonteFisica: {
          type: 'string',
          enum: Object.values(FonteFisicaEnum),
        },
        conferenciaId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  @UseInterceptors(
    LimparUploadOrfaoInterceptor,
    FileInterceptor('file', { fileFilter: imagemFileFilter }),
  )
  uploadFoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFotoEvidenciaDto: UploadFotoEvidenciaDto,
  ): Promise<UploadFotoEvidenciaResponseDto> {
    return this.fotosEvidenciaService.createFromUpload(
      file,
      uploadFotoEvidenciaDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'CRUD gerado: pagina todas as fotos do banco',
    description: 'Sem filtro por conferencia nem por peca (gap 4).',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(FotoEvidencia),
  })
  async findAll(
    @Query() query: FindAllFotosEvidenciaDto,
  ): Promise<InfinityPaginationResponseDto<FotoEvidencia>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.fotosEvidenciaService.findAllWithPagination({
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
  @ApiOperation({
    summary: 'CRUD gerado: uma evidencia pelo id (com a `url` pronta)',
  })
  @ApiOkResponse({
    type: FotoEvidencia,
  })
  findById(@Param('id') id: string) {
    return this.fotosEvidenciaService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'CRUD gerado: edita a evidencia (a UI nao expoe)',
    description:
      'Trocar a `url` ou a `fonteFisica` de uma foto que ja lastreia um ' +
      'veredito emitido falsifica a trilha de auditoria (gap 16).',
  })
  @ApiOkResponse({
    type: FotoEvidencia,
  })
  update(
    @Param('id') id: string,
    @Body() updateFotoEvidenciaDto: UpdateFotoEvidenciaDto,
  ) {
    return this.fotosEvidenciaService.update(id, updateFotoEvidenciaDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'CRUD gerado: apaga a evidencia (a UI nao expoe)',
    description:
      'Some com a foto que lastreia campos ja conferidos — hard delete, sem ' +
      'trilha (gaps 2 e 16).',
  })
  remove(@Param('id') id: string) {
    return this.fotosEvidenciaService.remove(id);
  }
}
