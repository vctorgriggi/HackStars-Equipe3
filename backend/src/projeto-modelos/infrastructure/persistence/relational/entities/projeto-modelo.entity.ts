import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'projeto_modelo',
})
export class ProjetoModeloEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: String,
  })
  checklist: string;

  @Column({
    nullable: true,
    type: String,
  })
  descricao?: string | null;

  // Código do desenho (ex.: EPT-163-PI-676): identificador natural do projeto.
  @Column({
    nullable: false,
    type: String,
    unique: true,
  })
  codigo: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
