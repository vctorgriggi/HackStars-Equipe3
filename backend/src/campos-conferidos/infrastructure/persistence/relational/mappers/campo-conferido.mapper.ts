import { CampoConferido } from '../../../../domain/campo-conferido';

import { FotoEvidenciaMapper } from '../../../../../fotos-evidencia/infrastructure/persistence/relational/mappers/foto-evidencia.mapper';

import { ConferenciaMapper } from '../../../../../conferencias/infrastructure/persistence/relational/mappers/conferencia.mapper';

import { CampoConferidoEntity } from '../entities/campo-conferido.entity';

export class CampoConferidoMapper {
  static toDomain(raw: CampoConferidoEntity): CampoConferido {
    const domainEntity = new CampoConferido();
    domainEntity.regiaoLeitura = raw.regiaoLeitura;

    if (raw.fotoEvidencia) {
      domainEntity.fotoEvidencia = FotoEvidenciaMapper.toDomain(
        raw.fotoEvidencia,
      );
    } else if (raw.fotoEvidencia === null) {
      domainEntity.fotoEvidencia = null;
    }

    domainEntity.veredito = raw.veredito;

    domainEntity.confianca = raw.confianca;

    domainEntity.valorLido = raw.valorLido;

    domainEntity.valorEsperado = raw.valorEsperado;

    domainEntity.nomeCampo = raw.nomeCampo;

    if (raw.conferencia) {
      domainEntity.conferencia = ConferenciaMapper.toDomain(raw.conferencia);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: CampoConferido): CampoConferidoEntity {
    const persistenceEntity = new CampoConferidoEntity();
    persistenceEntity.regiaoLeitura = domainEntity.regiaoLeitura;

    if (domainEntity.fotoEvidencia) {
      persistenceEntity.fotoEvidencia = FotoEvidenciaMapper.toPersistence(
        domainEntity.fotoEvidencia,
      );
    } else if (domainEntity.fotoEvidencia === null) {
      persistenceEntity.fotoEvidencia = null;
    }

    persistenceEntity.veredito = domainEntity.veredito;

    persistenceEntity.confianca = domainEntity.confianca;

    persistenceEntity.valorLido = domainEntity.valorLido;

    persistenceEntity.valorEsperado = domainEntity.valorEsperado;

    persistenceEntity.nomeCampo = domainEntity.nomeCampo;

    if (domainEntity.conferencia) {
      persistenceEntity.conferencia = ConferenciaMapper.toPersistence(
        domainEntity.conferencia,
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
