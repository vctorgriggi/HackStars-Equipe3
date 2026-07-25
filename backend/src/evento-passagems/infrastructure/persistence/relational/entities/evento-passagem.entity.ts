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
  name: 'evento_passagem',
})
export class EventoPassagemEntity extends EntityRelationalHelper {
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
