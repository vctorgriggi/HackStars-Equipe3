import { Passagem } from '../../../../domain/passagem';
import { ConferenciaMapper } from '../../../../../conferencias/infrastructure/persistence/relational/mappers/conferencia.mapper';

import { CheckpointMapper } from '../../../../../checkpoints/infrastructure/persistence/relational/mappers/checkpoint.mapper';

import { TransformadorMapper } from '../../../../../transformadores/infrastructure/persistence/relational/mappers/transformador.mapper';

import { PassagemEntity } from '../entities/passagem.entity';

export class PassagemMapper {
  static toDomain(raw: PassagemEntity): Passagem {
    const domainEntity = new Passagem();
    if (raw.conferencia) {
      domainEntity.conferencia = ConferenciaMapper.toDomain(raw.conferencia);
    } else if (raw.conferencia === null) {
      domainEntity.conferencia = null;
    }

    domainEntity.observacao = raw.observacao;

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

  static toPersistence(domainEntity: Passagem): PassagemEntity {
    const persistenceEntity = new PassagemEntity();
    if (domainEntity.conferencia) {
      persistenceEntity.conferencia = ConferenciaMapper.toPersistence(
        domainEntity.conferencia,
      );
    } else if (domainEntity.conferencia === null) {
      persistenceEntity.conferencia = null;
    }

    persistenceEntity.observacao = domainEntity.observacao;

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
