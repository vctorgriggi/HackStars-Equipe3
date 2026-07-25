import { Module } from '@nestjs/common';
import { TransformadorRepository } from '../transformador.repository';
import { TransformadorRelationalRepository } from './repositories/transformador.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransformadorEntity } from './entities/transformador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransformadorEntity])],
  providers: [
    {
      provide: TransformadorRepository,
      useClass: TransformadorRelationalRepository,
    },
  ],
  exports: [TransformadorRepository],
})
export class RelationalTransformadorPersistenceModule {}
