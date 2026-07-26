import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from '../../../../cameras/infrastructure/persistence/relational/entities/camera.entity';
import { CheckpointEntity } from '../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { CameraSeedService } from './camera-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([CameraEntity, CheckpointEntity])],
  providers: [CameraSeedService],
  exports: [CameraSeedService],
})
export class CameraSeedModule {}
