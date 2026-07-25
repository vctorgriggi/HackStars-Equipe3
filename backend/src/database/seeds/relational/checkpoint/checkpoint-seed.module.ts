import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckpointEntity } from '../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';
import { CheckpointSeedService } from './checkpoint-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheckpointEntity])],
  providers: [CheckpointSeedService],
  exports: [CheckpointSeedService],
})
export class CheckpointSeedModule {}
