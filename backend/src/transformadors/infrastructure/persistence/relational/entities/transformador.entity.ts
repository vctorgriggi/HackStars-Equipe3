import { ProjetoModeloEntity } from '../../../../../projeto-modelos/infrastructure/persistence/relational/entities/projeto-modelo.entity';

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
  name: 'transformador',
})
export class TransformadorEntity extends EntityRelationalHelper {
  @ManyToOne(() => ProjetoModeloEntity, { eager: true, nullable: true })
  projetoModelo?: ProjetoModeloEntity | null;

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
