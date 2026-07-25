import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'checkpoint',
})
export class CheckpointEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Number,
  })
  ordem: number;

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
