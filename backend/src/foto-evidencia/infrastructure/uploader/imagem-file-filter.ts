import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

// Foto de evidência é sempre imagem; heic/heif entram porque é o padrão da
// câmera do iPhone. O tamanho máximo continua vindo do módulo de files
// (file.maxFileSize) — aqui só se restringe o tipo.
export const MIMETYPES_IMAGEM_EVIDENCIA = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const imagemFileFilter = (
  request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (!MIMETYPES_IMAGEM_EVIDENCIA.includes(file.mimetype.toLowerCase())) {
    return callback(
      new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: `cantUploadFileType`,
        },
      }),
      false,
    );
  }

  callback(null, true);
};
