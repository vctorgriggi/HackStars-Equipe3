import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { Observable, catchError, throwError } from 'rxjs';

// O multer grava o arquivo antes da validação do corpo; se a requisição cair
// depois (fonteFisica inválida, conferência inexistente), o arquivo ficaria
// órfão no disco sem linha em file/foto_evidencia. Vale para o driver local —
// no s3 o multer-s3 não expõe `path` e a limpeza simplesmente não roda.
@Injectable()
export class LimparUploadOrfaoInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      file?: { path?: string };
    }>();

    return next.handle().pipe(
      catchError((error: unknown) => {
        const caminho = request.file?.path;

        if (caminho) {
          // Best-effort: falha ao apagar não pode mascarar o erro original.
          void unlink(caminho).catch(() => undefined);
        }

        return throwError(() => error);
      }),
    );
  }
}
