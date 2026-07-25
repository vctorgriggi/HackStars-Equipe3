import { FotoEvidencia } from '../../../../domain/foto-evidencia';
import { ConferenciaMapper } from '../../../../../conferencia/infrastructure/persistence/relational/mappers/conferencia.mapper';

import { FotoEvidenciaEntity } from '../entities/foto-evidencia.entity';

export class FotoEvidenciaMapper {
  static toDomain(raw: FotoEvidenciaEntity): FotoEvidencia {
    const domainEntity = new FotoEvidencia();
    if (raw.conferencia) {
      domainEntity.conferencia = ConferenciaMapper.toDomain(raw.conferencia);
    } else if (raw.conferencia === null) {
      domainEntity.conferencia = null;
    }

    domainEntity.fonteFisica = raw.fonteFisica;

    domainEntity.url = raw.url;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FotoEvidencia): FotoEvidenciaEntity {
    const persistenceEntity = new FotoEvidenciaEntity();
    if (domainEntity.conferencia) {
      persistenceEntity.conferencia = ConferenciaMapper.toPersistence(
        domainEntity.conferencia,
      );
    } else if (domainEntity.conferencia === null) {
      persistenceEntity.conferencia = null;
    }

    persistenceEntity.fonteFisica = domainEntity.fonteFisica;

    persistenceEntity.url = domainEntity.url;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
