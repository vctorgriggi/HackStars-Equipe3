import { Module } from '@nestjs/common';
import { CameraRepository } from '../camera.repository';
import { CameraRelationalRepository } from './repositories/camera.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from './entities/camera.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CameraEntity])],
  providers: [
    {
      provide: CameraRepository,
      useClass: CameraRelationalRepository,
    },
  ],
  exports: [CameraRepository],
})
export class RelationalCameraPersistenceModule {}
