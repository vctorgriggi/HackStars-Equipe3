import { Module } from '@nestjs/common';

import { DemoController } from './demo.controller';

// Módulo temporário: só serve a página de demonstração (ver demo.controller.ts).
@Module({
  controllers: [DemoController],
})
export class DemoModule {}
