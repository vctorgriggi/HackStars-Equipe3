import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'cliente',
})
export class ClienteEntity extends EntityRelationalHelper {
  // Chave de negocio do cadastro: o vinculo nasce por find-or-create pelo
  // nome vindo do QR/digitacao, entao nome duplicado viraria vinculo ambiguo.
  @Column({
    nullable: false,
    type: String,
    unique: true,
  })
  nome: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
