import { Transformador } from '../../../../domain/transformador';
import { ClienteMapper } from '../../../../../clientes/infrastructure/persistence/relational/mappers/cliente.mapper';

import { ProjetoModeloMapper } from '../../../../../projetos-modelo/infrastructure/persistence/relational/mappers/projeto-modelo.mapper';

import { TransformadorEntity } from '../entities/transformador.entity';

export class TransformadorMapper {
  static toDomain(raw: TransformadorEntity): Transformador {
    const domainEntity = new Transformador();
    if (raw.clienteVinculado) {
      domainEntity.clienteVinculado = ClienteMapper.toDomain(
        raw.clienteVinculado,
      );
    } else if (raw.clienteVinculado === null) {
      domainEntity.clienteVinculado = null;
    }

    if (raw.projetoModelo) {
      domainEntity.projetoModelo = ProjetoModeloMapper.toDomain(
        raw.projetoModelo,
      );
    } else if (raw.projetoModelo === null) {
      domainEntity.projetoModelo = null;
    }

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
    if (domainEntity.clienteVinculado) {
      persistenceEntity.clienteVinculado = ClienteMapper.toPersistence(
        domainEntity.clienteVinculado,
      );
    } else if (domainEntity.clienteVinculado === null) {
      persistenceEntity.clienteVinculado = null;
    }

    if (domainEntity.projetoModelo) {
      persistenceEntity.projetoModelo = ProjetoModeloMapper.toPersistence(
        domainEntity.projetoModelo,
      );
    } else if (domainEntity.projetoModelo === null) {
      persistenceEntity.projetoModelo = null;
    }

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
