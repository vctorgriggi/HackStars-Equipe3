import { FileType } from '../../../files/domain/file';

// Porta do upload de evidência: exatamente a assinatura dos uploaders do
// boilerplate (FilesLocalService / FilesS3Service). Quem escolhe a
// implementação é o FILE_DRIVER, no módulo — trocar local↔s3 é só env.
export abstract class EvidenciaUploader {
  abstract create(file: Express.Multer.File): Promise<{ file: FileType }>;
}
