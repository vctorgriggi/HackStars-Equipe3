import { Conferencia } from '../../../../domain/conferencia';

import { CheckpointMapper } from '../../../../../checkpoints/infrastructure/persistence/relational/mappers/checkpoint.mapper';

import { TransformadorMapper } from '../../../../../transformadors/infrastructure/persistence/relational/mappers/transformador.mapper';

import { ConferenciaEntity } from '../entities/conferencia.entity';

export class ConferenciaMapper {
  static toDomain(raw: ConferenciaEntity): Conferencia {
    const domainEntity = new Conferencia();
    domainEntity.observacao = raw.observacao;

    domainEntity.vereditoGeral = raw.vereditoGeral;

    if (raw.checkpoint) {
      domainEntity.checkpoint = CheckpointMapper.toDomain(raw.checkpoint);
    } else if (raw.checkpoint === null) {
      domainEntity.checkpoint = null;
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

  static toPersistence(domainEntity: Conferencia): ConferenciaEntity {
    const persistenceEntity = new ConferenciaEntity();
    persistenceEntity.observacao = domainEntity.observacao;

    persistenceEntity.vereditoGeral = domainEntity.vereditoGeral;

    if (domainEntity.checkpoint) {
      persistenceEntity.checkpoint = CheckpointMapper.toPersistence(
        domainEntity.checkpoint,
      );
    } else if (domainEntity.checkpoint === null) {
      persistenceEntity.checkpoint = null;
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
