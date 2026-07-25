import { CheckpointEntity } from '../../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';

import { TransformadorEntity } from '../../../../../transformadors/infrastructure/persistence/relational/entities/transformador.entity';

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
  name: 'conferencia',
})
export class ConferenciaEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  vereditoGeral?: string | null;

  @ManyToOne(() => CheckpointEntity, { eager: true, nullable: true })
  checkpoint?: CheckpointEntity | null;

  @ManyToOne(() => TransformadorEntity, { eager: true, nullable: false })
  transformador: TransformadorEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
