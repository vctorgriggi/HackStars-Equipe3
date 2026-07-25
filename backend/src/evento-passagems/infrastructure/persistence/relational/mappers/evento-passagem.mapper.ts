import { EventoPassagem } from '../../../../domain/evento-passagem';
import { CheckpointMapper } from '../../../../../checkpoints/infrastructure/persistence/relational/mappers/checkpoint.mapper';

import { TransformadorMapper } from '../../../../../transformadors/infrastructure/persistence/relational/mappers/transformador.mapper';

import { EventoPassagemEntity } from '../entities/evento-passagem.entity';

export class EventoPassagemMapper {
  static toDomain(raw: EventoPassagemEntity): EventoPassagem {
    const domainEntity = new EventoPassagem();
    if (raw.checkpoint) {
      domainEntity.checkpoint = CheckpointMapper.toDomain(raw.checkpoint);
    }

    if (raw.transformador) {
      domainEntity.transformador = TransformadorMapper.toDomain(
        raw.transformador,
      );
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: EventoPassagem): EventoPassagemEntity {
    const persistenceEntity = new EventoPassagemEntity();
    if (domainEntity.checkpoint) {
      persistenceEntity.checkpoint = CheckpointMapper.toPersistence(
        domainEntity.checkpoint,
      );
    }

    if (domainEntity.transformador) {
      persistenceEntity.transformador = TransformadorMapper.toPersistence(
        domainEntity.transformador,
      );
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
