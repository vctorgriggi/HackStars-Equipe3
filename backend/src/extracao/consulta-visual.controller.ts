import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';

import { ehMimeSuportado } from './adapters/bedrock.extractor';
import {
  ConsultaVisualDto,
  RespostaConsultaVisual,
} from './dto/consulta-visual.dto';
import {
  CONSULTA_VISUAL_PORT,
  ConsultaVisualPort,
} from './ports/consulta-visual.port';

/**
 * Endpoint de TESTE/utilitario da consulta visual generica. Nao faz parte do
 * fluxo de conferencia: a resposta e texto livre do modelo, sem confianca e
 * sem evidencia, e jamais entra em veredito (regra de ouro).
 *
 * Storage em MEMORIA de proposito: o buffer vai direto ao adapter e nada e
 * gravado em disco nem no S3 — sem arquivo orfao para limpar e sem
 * FotoEvidencia criada.
 */
@ApiTags('Extração')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'extracao',
  version: '1',
})
export class ConsultaVisualController {
  constructor(
    @Inject(CONSULTA_VISUAL_PORT)
    private readonly consultaVisual: ConsultaVisualPort,
  ) {}

  @Post('consulta-visual')
  @ApiOperation({
    summary: 'Utilitário: envia UMA foto + UM texto ao modelo de visão',
    description:
      'Endpoint de teste/inspeção (candidato ao check qualitativo de ' +
      'layout). CADA CHAMADA CONSOME CRÉDITO AWS (constraint 4 do SPEC) — ' +
      'dispare só sob ação explícita. A resposta é TEXTO LIVRE do modelo: ' +
      'não é leitura de campo, não carrega confiança nem evidência e NUNCA ' +
      'entra em veredito de conformidade. Nada é persistido. Driver por ' +
      '`CONSULTA_VISUAL_DRIVER` (bedrock default | mock).',
  })
  @ApiCreatedResponse({ type: RespostaConsultaVisual })
  @ApiUnprocessableEntityResponse({
    description:
      'Arquivo ausente (`foto: foto-obrigatoria`) ou tipo fora da whitelist ' +
      'de imagem — jpeg, png, gif, webp — (`foto: mime-nao-suportado`).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['foto', 'texto'],
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
        },
        texto: {
          type: 'string',
          example: 'Qual é o número de série gravado neste transformador?',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  async consultar(
    @UploadedFile() foto: Express.Multer.File | undefined,
    @Body() dto: ConsultaVisualDto,
  ): Promise<RespostaConsultaVisual> {
    if (!foto) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { foto: 'foto-obrigatoria' },
      });
    }

    if (!ehMimeSuportado(foto.mimetype)) {
      // Barrado AQUI, antes do adapter: mime invalido nao pode gastar chamada
      // nem virar 500 generico.
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { foto: 'mime-nao-suportado' },
      });
    }

    const resposta = await this.consultaVisual.consultar(
      foto.buffer,
      foto.mimetype,
      dto.texto,
    );

    return {
      resposta,
      modelo: this.consultaVisual.modelo,
      driver: this.consultaVisual.nome,
    };
  }
}
