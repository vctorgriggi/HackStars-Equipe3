import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'transformador',
})
export class TransformadorEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  descricao?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  cliente: string;

  @Column({
    nullable: true,
    type: String,
  })
  seq?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  pedido?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  patrimonio: string;

  @Column({
    nullable: false,
    type: String,
  })
  numeroSerie: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
