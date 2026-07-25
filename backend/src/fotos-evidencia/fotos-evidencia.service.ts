import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { ConferenciasService } from '../conferencias/conferencias.service';
import { Conferencia } from '../conferencias/domain/conferencia';

import {
  // common
  Injectable,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateFotoEvidenciaDto } from './dto/create-foto-evidencia.dto';
import { UpdateFotoEvidenciaDto } from './dto/update-foto-evidencia.dto';
import { FotoEvidenciaRepository } from './infrastructure/persistence/foto-evidencia.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FotoEvidencia } from './domain/foto-evidencia';
import { UploadFotoEvidenciaDto } from './dto/upload-foto-evidencia.dto';
import { UploadFotoEvidenciaResponseDto } from './dto/upload-foto-evidencia-response.dto';
import { EvidenciaUploader } from './infrastructure/uploader/evidencia-uploader';
import { FonteFisicaEnum } from './fonte-fisica.enum';
import fileConfig from '../files/config/file.config';
import { FileConfig, FileDriver } from '../files/config/file-config.type';

/** Bytes de uma evidência já gravada, prontos para a extração por visão. */
export interface ConteudoEvidencia {
  buffer: Buffer;
  mimeType: string;
  fonteFisica: string;
}

// Mime derivado da extensão do arquivo/key. A whitelist do upload
// (imagem-file-filter) só deixa passar jpg/jpeg/png/webp; qualquer outra
// extensão cai no genérico e o adapter de visão recusa com mensagem própria
// ('mime-nao-suportado') em vez de mandar bytes opacos para a AWS.
const MIME_POR_EXTENSAO: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const MIME_GENERICO = 'application/octet-stream';

// Mesma pasta do diskStorage do driver local
// (files/infrastructure/uploader/local/files.module.ts: destination './files').
const PASTA_ARQUIVOS_LOCAL = 'files';

// Caminho servido pelo módulo de files ('/api/v1/files/<hash>.<ext>'); casa
// também com a forma relativa 'files/<hash>.<ext>'.
const REGEX_CAMINHO_LOCAL = /(^|\/)files\/[^/]+$/;

/**
 * De onde vêm os bytes de uma evidência já gravada.
 *
 * O `url` guarda caminho ou key conforme o FILE_DRIVER vigente NO UPLOAD — e o
 * driver mudou no meio da Fase 2 (local → s3). A FORMA do valor sobrevive à
 * troca de driver; o driver, não. Por isso ela decide primeiro (achado 13 da
 * revisão: `driver === LOCAL` curto-circuitava a forma e mandava key de bucket
 * para o `readFile`, um 500 garantido no cenário documentado de dev local
 * apontando para o RDS de produção, cujas fotos estão no S3):
 *
 * 1. `.../files/<nome>` (ou `files/<nome>`) — é o caminho que o
 *    FilesLocalService persiste; está no disco;
 * 2. qualquer outro separador de diretório — forma ambígua de verdade (key com
 *    prefixo × caminho customizado): aí, e só aí, o driver desempata;
 * 3. nome chapado, sem barra — é exatamente como o multer-s3 nomeia a key; vale
 *    mesmo sob FILE_DRIVER=local.
 */
export function ehCaminhoDeDisco(url: string, driver: FileDriver): boolean {
  if (REGEX_CAMINHO_LOCAL.test(url)) {
    return true;
  }

  if (url.includes('/') || url.includes('\\')) {
    return driver === FileDriver.LOCAL;
  }

  return false;
}

function mimeTypeDe(url: string): string {
  return MIME_POR_EXTENSAO[extname(url).toLowerCase()] ?? MIME_GENERICO;
}

// Driver local: `url` é o caminho servido ('/api/v1/files/<hash>.<ext>') e o
// arquivo mora em './files/<hash>.<ext>'. Só o basename entra no caminho — url
// vinda do banco nunca sobe de diretório.
function lerDoDisco(url: string): Promise<Buffer> {
  return readFile(resolve(process.cwd(), PASTA_ARQUIVOS_LOCAL, basename(url)));
}

// Driver s3: `url` é a KEY do objeto no bucket (FilesS3Service persiste
// `file.key`). O SDK da AWS pode aparecer aqui: este módulo é a fronteira de
// evidências (CLAUDE.md, "Nunca chamar SDK AWS fora de extracao/evidencias").
async function lerDoS3(config: FileConfig, key: string): Promise<Buffer> {
  const s3 = new S3Client({
    region: config.awsS3Region ?? '',
    credentials: {
      accessKeyId: config.accessKeyId ?? '',
      secretAccessKey: config.secretAccessKey ?? '',
    },
  });

  const resposta = await s3.send(
    new GetObjectCommand({
      Bucket: config.awsDefaultS3Bucket ?? '',
      Key: key,
    }),
  );

  const bytes = await resposta.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`objeto sem corpo no bucket: ${key}`);
  }

  return Buffer.from(bytes);
}

@Injectable()
export class FotosEvidenciaService {
  private readonly logger = new Logger(FotosEvidenciaService.name);

  constructor(
    private readonly conferenciasService: ConferenciasService,

    private readonly evidenciaUploader: EvidenciaUploader,

    // Dependencies here
    private readonly fotoEvidenciaRepository: FotoEvidenciaRepository,
  ) {}

  /**
   * Bytes de uma evidência já enviada, para alimentar a extração por visão.
   * O consumidor recebe Buffer e não sabe de onde veio: disco (FILE_DRIVER
   * local) ou bucket (s3) é decisão desta fronteira, não da extração.
   *
   * Evidência inexistente devolve `null` — quem chamou decide o status HTTP.
   * Falha de storage é erro de infraestrutura, não do cliente: sobe como 500
   * carimbado com o id ('falha-ao-ler-evidencia: <id>').
   */
  async lerConteudo(
    id: FotoEvidencia['id'],
  ): Promise<ConteudoEvidencia | null> {
    const fotoEvidencia = await this.fotoEvidenciaRepository.findById(id);
    if (!fotoEvidencia) {
      return null;
    }

    return this.lerConteudoDe(fotoEvidencia);
  }

  /**
   * Mesmo storage do `lerConteudo`, para quem JÁ tem o registro em mãos —
   * quem valida o lote de evidências antes de pagar visão precisa da
   * `fonteFisica` e do vínculo ANTES de decidir se vale ler os bytes, e
   * relê-los por id custaria uma consulta por foto sem nenhum ganho.
   */
  async lerConteudoDe(
    fotoEvidencia: FotoEvidencia,
  ): Promise<ConteudoEvidencia> {
    const config = fileConfig() as FileConfig;

    try {
      const buffer = ehCaminhoDeDisco(fotoEvidencia.url, config.driver)
        ? await lerDoDisco(fotoEvidencia.url)
        : await lerDoS3(config, fotoEvidencia.url);

      return {
        buffer,
        mimeType: mimeTypeDe(fotoEvidencia.url),
        fonteFisica: fotoEvidencia.fonteFisica,
      };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(
        `falha-ao-ler-evidencia: ${fotoEvidencia.id} (driver ${config.driver}, ` +
          `url "${fotoEvidencia.url}") — ${motivo}`,
      );

      throw new InternalServerErrorException(
        `falha-ao-ler-evidencia: ${fotoEvidencia.id}`,
      );
    }
  }

  /**
   * Amarra à conferência as evidências que a lastreiam e ainda estavam soltas
   * (achado 6 da revisão: sem isso a relação CONFERENCIA ||--o{ FOTO_EVIDENCIA
   * nascia sempre vazia e a mesma foto podia lastrear conferências de peças
   * diferentes).
   *
   * Só toca em foto SEM conferência: evidência já presa a outra conferência
   * não é re-apontada aqui — reescrever esse vínculo falsificaria a trilha de
   * auditoria de um veredito já emitido. Quem recusa esse caso é o chamador,
   * ANTES da visão.
   *
   * Devolve quantas foram vinculadas.
   */
  async vincularAConferencia(
    ids: FotoEvidencia['id'][],
    conferencia: Conferencia,
  ): Promise<number> {
    let vinculadas = 0;

    for (const id of new Set(ids)) {
      const fotoEvidencia = await this.fotoEvidenciaRepository.findById(id);
      if (!fotoEvidencia || fotoEvidencia.conferencia) {
        continue;
      }

      await this.fotoEvidenciaRepository.update(id, { conferencia });
      vinculadas += 1;
    }

    return vinculadas;
  }

  // Upload da foto + registro da evidência em uma chamada: o arquivo vai pelo
  // uploader do boilerplate (driver do FILE_DRIVER) e a url persistida é a que
  // o próprio módulo de files devolve.
  async createFromUpload(
    file: Express.Multer.File,
    uploadFotoEvidenciaDto: UploadFotoEvidenciaDto,
  ): Promise<UploadFotoEvidenciaResponseDto> {
    // Conferência inexistente é 422 antes de gravar o arquivo.
    if (uploadFotoEvidenciaDto.conferenciaId) {
      const conferenciaObject = await this.conferenciasService.findById(
        uploadFotoEvidenciaDto.conferenciaId,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferenciaId: 'notExists',
          },
        });
      }
    }

    // Arquivo ausente é 422 ('selectFile') — mesma checagem do files.service.
    const uploaded = await this.evidenciaUploader.create(file);

    const fotoEvidencia = await this.create({
      url: uploaded.file.path,
      fonteFisica: uploadFotoEvidenciaDto.fonteFisica,
      conferencia: uploadFotoEvidenciaDto.conferenciaId
        ? { id: uploadFotoEvidenciaDto.conferenciaId }
        : null,
    });

    // Instância de classe (não objeto literal): o ClassSerializerInterceptor
    // só executa o @TransformUrlEvidencia (URL assinada no s3) em instâncias.
    return Object.assign(new UploadFotoEvidenciaResponseDto(), {
      id: fotoEvidencia.id,
      url: fotoEvidencia.url,
      fonteFisica: fotoEvidencia.fonteFisica as FonteFisicaEnum,
      conferenciaId: fotoEvidencia.conferencia?.id ?? null,
    });
  }

  async create(createFotoEvidenciaDto: CreateFotoEvidenciaDto) {
    // Do not remove comment below.
    // <creating-property />
    let conferencia: Conferencia | null | undefined = undefined;

    if (createFotoEvidenciaDto.conferencia) {
      const conferenciaObject = await this.conferenciasService.findById(
        createFotoEvidenciaDto.conferencia.id,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferencia: 'notExists',
          },
        });
      }
      conferencia = conferenciaObject;
    } else if (createFotoEvidenciaDto.conferencia === null) {
      conferencia = null;
    }

    return this.fotoEvidenciaRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      conferencia,

      fonteFisica: createFotoEvidenciaDto.fonteFisica,

      url: createFotoEvidenciaDto.url,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.fotoEvidenciaRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: FotoEvidencia['id']) {
    return this.fotoEvidenciaRepository.findById(id);
  }

  findByIds(ids: FotoEvidencia['id'][]) {
    return this.fotoEvidenciaRepository.findByIds(ids);
  }

  async update(
    id: FotoEvidencia['id'],

    updateFotoEvidenciaDto: UpdateFotoEvidenciaDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let conferencia: Conferencia | null | undefined = undefined;

    if (updateFotoEvidenciaDto.conferencia) {
      const conferenciaObject = await this.conferenciasService.findById(
        updateFotoEvidenciaDto.conferencia.id,
      );
      if (!conferenciaObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conferencia: 'notExists',
          },
        });
      }
      conferencia = conferenciaObject;
    } else if (updateFotoEvidenciaDto.conferencia === null) {
      conferencia = null;
    }

    return this.fotoEvidenciaRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      conferencia,

      fonteFisica: updateFotoEvidenciaDto.fonteFisica,

      url: updateFotoEvidenciaDto.url,
    });
  }

  remove(id: FotoEvidencia['id']) {
    return this.fotoEvidenciaRepository.remove(id);
  }
}
