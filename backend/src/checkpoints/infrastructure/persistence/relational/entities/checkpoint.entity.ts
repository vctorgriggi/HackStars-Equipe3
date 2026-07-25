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
  // Slug estável de máquina (ex.: serigrafia): regras de gate casam por ele,
  // nunca por nome exibido nem por ordem.
  @Column({
    nullable: false,
    type: String,
    unique: true,
  })
  codigo: string;

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
