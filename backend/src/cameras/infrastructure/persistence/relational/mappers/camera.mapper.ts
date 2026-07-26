import { Camera } from '../../../../domain/camera';
import { CheckpointMapper } from '../../../../../checkpoints/infrastructure/persistence/relational/mappers/checkpoint.mapper';

import { CameraEntity } from '../entities/camera.entity';

export class CameraMapper {
  static toDomain(raw: CameraEntity): Camera {
    const domainEntity = new Camera();
    if (raw.checkpoint) {
      domainEntity.checkpoint = CheckpointMapper.toDomain(raw.checkpoint);
    } else if (raw.checkpoint === null) {
      domainEntity.checkpoint = null;
    }

    domainEntity.endpoint = raw.endpoint;

    domainEntity.ativa = raw.ativa;

    domainEntity.fonteFisica = raw.fonteFisica;

    domainEntity.nome = raw.nome;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Camera): CameraEntity {
    const persistenceEntity = new CameraEntity();
    if (domainEntity.checkpoint) {
      persistenceEntity.checkpoint = CheckpointMapper.toPersistence(
        domainEntity.checkpoint,
      );
    } else if (domainEntity.checkpoint === null) {
      persistenceEntity.checkpoint = null;
    }

    persistenceEntity.endpoint = domainEntity.endpoint;

    persistenceEntity.ativa = domainEntity.ativa;

    persistenceEntity.fonteFisica = domainEntity.fonteFisica;

    persistenceEntity.nome = domainEntity.nome;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
