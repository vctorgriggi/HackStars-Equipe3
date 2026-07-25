import { ProjetoModelo } from '../../../../domain/projeto-modelo';

import { ProjetoModeloEntity } from '../entities/projeto-modelo.entity';

export class ProjetoModeloMapper {
  static toDomain(raw: ProjetoModeloEntity): ProjetoModelo {
    const domainEntity = new ProjetoModelo();
    domainEntity.checklist = raw.checklist;

    domainEntity.descricao = raw.descricao;

    domainEntity.codigo = raw.codigo;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: ProjetoModelo): ProjetoModeloEntity {
    const persistenceEntity = new ProjetoModeloEntity();
    persistenceEntity.checklist = domainEntity.checklist;

    persistenceEntity.descricao = domainEntity.descricao;

    persistenceEntity.codigo = domainEntity.codigo;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
