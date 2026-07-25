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
import { FotoEvidenciaService } from './foto-evidencia.service';
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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FotoEvidencia } from './domain/foto-evidencia';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllFotoEvidenciaDto } from './dto/find-all-foto-evidencia.dto';

@ApiTags('Fotoevidencia')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'foto-evidencia',
  version: '1',
})
export class FotoEvidenciaController {
  constructor(private readonly fotoEvidenciaService: FotoEvidenciaService) {}

  @Post()
  @ApiCreatedResponse({
    type: FotoEvidencia,
  })
  create(@Body() createFotoEvidenciaDto: CreateFotoEvidenciaDto) {
    return this.fotoEvidenciaService.create(createFotoEvidenciaDto);
  }

  // Upload da foto + criação da evidência em uma chamada (multipart).
  // Só o fileFilter é local; storage e tamanho máximo vêm do MulterModule do
  // driver ativo (FILE_DRIVER), reexportado pelo módulo de files.
  @Post('upload')
  @ApiCreatedResponse({
    type: UploadFotoEvidenciaResponseDto,
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
    return this.fotoEvidenciaService.createFromUpload(
      file,
      uploadFotoEvidenciaDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(FotoEvidencia),
  })
  async findAll(
    @Query() query: FindAllFotoEvidenciaDto,
  ): Promise<InfinityPaginationResponseDto<FotoEvidencia>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.fotoEvidenciaService.findAllWithPagination({
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
    type: FotoEvidencia,
  })
  findById(@Param('id') id: string) {
    return this.fotoEvidenciaService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: FotoEvidencia,
  })
  update(
    @Param('id') id: string,
    @Body() updateFotoEvidenciaDto: UpdateFotoEvidenciaDto,
  ) {
    return this.fotoEvidenciaService.update(id, updateFotoEvidenciaDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.fotoEvidenciaService.remove(id);
  }
}
