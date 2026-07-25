import { Checkpoint } from '../../../../domain/checkpoint';

import { CheckpointEntity } from '../entities/checkpoint.entity';

export class CheckpointMapper {
  static toDomain(raw: CheckpointEntity): Checkpoint {
    const domainEntity = new Checkpoint();
    domainEntity.ordem = raw.ordem;

    domainEntity.nome = raw.nome;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Checkpoint): CheckpointEntity {
    const persistenceEntity = new CheckpointEntity();
    persistenceEntity.ordem = domainEntity.ordem;

    persistenceEntity.nome = domainEntity.nome;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
