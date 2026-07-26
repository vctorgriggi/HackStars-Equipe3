import { Module } from '@nestjs/common';

import { GateController } from './gate.controller';

// Módulo temporário: só serve a cena do modo câmera fixa (ver gate.controller.ts).
@Module({
  controllers: [GateController],
})
export class GateModule {}
