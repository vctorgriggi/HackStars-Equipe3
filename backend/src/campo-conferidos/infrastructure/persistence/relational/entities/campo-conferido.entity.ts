import { FotoEvidenciaEntity } from '../../../../../foto-evidencia/infrastructure/persistence/relational/entities/foto-evidencia.entity';

import { ConferenciaEntity } from '../../../../../conferencia/infrastructure/persistence/relational/entities/conferencia.entity';

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
  name: 'campo_conferido',
})
export class CampoConferidoEntity extends EntityRelationalHelper {
  @ManyToOne(() => FotoEvidenciaEntity, { eager: true, nullable: true })
  fotoEvidencia?: FotoEvidenciaEntity | null;

  @Column({
    nullable: true,
    type: String,
  })
  veredito?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  confianca?: number | null;

  @Column({
    nullable: true,
    type: String,
  })
  valorLido?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  valorEsperado: string;

  @Column({
    nullable: false,
    type: String,
  })
  nomeCampo: string;

  @ManyToOne(() => ConferenciaEntity, { eager: true, nullable: false })
  conferencia: ConferenciaEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
