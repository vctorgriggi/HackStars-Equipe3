import { Module } from '@nestjs/common';

import { EsteiraController } from './esteira.controller';

// Módulo temporário: só serve a cena de apresentação (ver esteira.controller.ts).
@Module({
  controllers: [EsteiraController],
})
export class EsteiraModule {}
