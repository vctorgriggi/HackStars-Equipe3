import { ConferenciaEntity } from '../../../../../conferencias/infrastructure/persistence/relational/entities/conferencia.entity';

import { CheckpointEntity } from '../../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';

import { TransformadorEntity } from '../../../../../transformadores/infrastructure/persistence/relational/entities/transformador.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'passagem',
})
export class PassagemEntity extends EntityRelationalHelper {
  @ManyToOne(() => ConferenciaEntity, { eager: true, nullable: true })
  conferencia?: ConferenciaEntity | null;

  @Column({
    nullable: true,
    type: String,
  })
  observacao?: string | null;

  @ManyToOne(() => CheckpointEntity, { eager: true, nullable: false })
  checkpoint: CheckpointEntity;

  @ManyToOne(() => TransformadorEntity, { eager: true, nullable: false })
  transformador: TransformadorEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
