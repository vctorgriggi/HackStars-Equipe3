import { CheckpointEntity } from '../../../../../checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'camera',
})
export class CameraEntity extends EntityRelationalHelper {
  @ManyToOne(() => CheckpointEntity, { eager: true, nullable: true })
  checkpoint?: CheckpointEntity | null;

  @Column({
    nullable: true,
    type: String,
  })
  endpoint?: string | null;

  @Column({
    nullable: false,
    type: Boolean,
  })
  ativa: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  fonteFisica: string;

  @Column({
    nullable: false,
    type: String,
  })
  nome: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
