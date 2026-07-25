import { ConferenciaEntity } from '../../../../../conferencia/infrastructure/persistence/relational/entities/conferencia.entity';

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
  name: 'foto_evidencia',
})
export class FotoEvidenciaEntity extends EntityRelationalHelper {
  @ManyToOne(() => ConferenciaEntity, { eager: true, nullable: true })
  conferencia?: ConferenciaEntity | null;

  @Column({
    nullable: true,
    type: String,
  })
  fonteFisica?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  url: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
