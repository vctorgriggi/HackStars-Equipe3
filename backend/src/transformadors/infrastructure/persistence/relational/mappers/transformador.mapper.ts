import { Transformador } from '../../../../domain/transformador';

import { TransformadorEntity } from '../entities/transformador.entity';

export class TransformadorMapper {
  static toDomain(raw: TransformadorEntity): Transformador {
    const domainEntity = new Transformador();
    domainEntity.descricao = raw.descricao;

    domainEntity.cliente = raw.cliente;

    domainEntity.seq = raw.seq;

    domainEntity.pedido = raw.pedido;

    domainEntity.patrimonio = raw.patrimonio;

    domainEntity.numeroSerie = raw.numeroSerie;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Transformador): TransformadorEntity {
    const persistenceEntity = new TransformadorEntity();
    persistenceEntity.descricao = domainEntity.descricao;

    persistenceEntity.cliente = domainEntity.cliente;

    persistenceEntity.seq = domainEntity.seq;

    persistenceEntity.pedido = domainEntity.pedido;

    persistenceEntity.patrimonio = domainEntity.patrimonio;

    persistenceEntity.numeroSerie = domainEntity.numeroSerie;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
