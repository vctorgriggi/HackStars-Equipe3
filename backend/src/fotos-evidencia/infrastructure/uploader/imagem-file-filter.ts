import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

// Foto de evidência é sempre imagem. HEIC/HEIF (câmera do iPhone) foi
// REMOVIDO da whitelist (revisão R1) e WEBP na rodada de análise, pelo mesmo
// motivo: o Textract (driver escolhido) só aceita JPEG/PNG — aceitar no
// upload só adiaria a falha para um 500 na extração.
// O front (T3.2) converte a captura para JPEG antes de subir (canvas).
// O tamanho máximo continua vindo do módulo de files (file.maxFileSize).
export const MIMETYPES_IMAGEM_EVIDENCIA = [
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// Extensões coerentes com os mimetypes acima. O mimetype é declarado pelo
// cliente e o diskStorage nomeia o arquivo pela extensão do originalname —
// sem esta checagem, "x.svg" com Content-Type image/png seria gravado e
// servido como svg (conteúdo ativo na origem da API).
const EXTENSOES_IMAGEM_EVIDENCIA = /\.(jpe?g|png)$/i;

export const imagemFileFilter = (
  request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  const mimetypeValido = MIMETYPES_IMAGEM_EVIDENCIA.includes(
    file.mimetype.toLowerCase(),
  );
  const extensaoValida = EXTENSOES_IMAGEM_EVIDENCIA.test(file.originalname);

  if (!mimetypeValido || !extensaoValida) {
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
