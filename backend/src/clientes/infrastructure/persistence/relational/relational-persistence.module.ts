import { Module } from '@nestjs/common';
import { ClienteRepository } from '../cliente.repository';
import { ClienteRelationalRepository } from './repositories/cliente.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteEntity } from './entities/cliente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClienteEntity])],
  providers: [
    {
      provide: ClienteRepository,
      useClass: ClienteRelationalRepository,
    },
  ],
  exports: [ClienteRepository],
})
export class RelationalClientePersistenceModule {}
