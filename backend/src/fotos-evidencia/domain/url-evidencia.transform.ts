import { Transform } from 'class-transformer';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fileConfig from '../../files/config/file.config';
import { FileConfig, FileDriver } from '../../files/config/file-config.type';
import appConfig from '../../config/app.config';
import { AppConfig } from '../../config/app-config.type';

// Mesmo comportamento do FileType.path do boilerplate (files/domain/file.ts):
// driver local → URL absoluta (backendDomain + caminho); driver s3 → URL
// assinada (1h). Sem isso, sob s3 o campo devolveria a key crua do bucket,
// que não abre no navegador — quebraria o critério do T2.3.
export function TransformUrlEvidencia(): PropertyDecorator {
  return Transform(
    ({ value }) => {
      if (!value) {
        return value;
      }
      const config = fileConfig() as FileConfig;
      if (config.driver === FileDriver.LOCAL) {
        // Valor já absoluto (ex.: criado via CRUD com URL externa) não ganha
        // prefixo — evitaria "http://localhost:3001https://...".
        if (/^https?:\/\//i.test(value)) {
          return value;
        }
        return (appConfig() as AppConfig).backendDomain + value;
      }
      if ([FileDriver.S3_PRESIGNED, FileDriver.S3].includes(config.driver)) {
        const s3 = new S3Client({
          region: config.awsS3Region ?? '',
          credentials: {
            accessKeyId: config.accessKeyId ?? '',
            secretAccessKey: config.secretAccessKey ?? '',
          },
        });
        return getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: config.awsDefaultS3Bucket ?? '',
            Key: value,
          }),
          { expiresIn: 3600 },
        );
      }
      return value;
    },
    { toPlainOnly: true },
  );
}
