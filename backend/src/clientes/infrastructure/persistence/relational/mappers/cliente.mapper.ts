import { Cliente } from '../../../../domain/cliente';

import { ClienteEntity } from '../entities/cliente.entity';

export class ClienteMapper {
  static toDomain(raw: ClienteEntity): Cliente {
    const domainEntity = new Cliente();
    domainEntity.nome = raw.nome;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Cliente): ClienteEntity {
    const persistenceEntity = new ClienteEntity();
    persistenceEntity.nome = domainEntity.nome;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
