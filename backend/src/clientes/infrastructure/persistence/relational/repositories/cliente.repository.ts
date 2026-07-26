import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClienteEntity } from '../entities/cliente.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Cliente } from '../../../../domain/cliente';
import { ClienteRepository } from '../../cliente.repository';
import { ClienteMapper } from '../mappers/cliente.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ClienteRelationalRepository implements ClienteRepository {
  constructor(
    @InjectRepository(ClienteEntity)
    private readonly clienteRepository: Repository<ClienteEntity>,
  ) {}

  async create(data: Cliente): Promise<Cliente> {
    const persistenceModel = ClienteMapper.toPersistence(data);
    const newEntity = await this.clienteRepository.save(
      this.clienteRepository.create(persistenceModel),
    );
    return ClienteMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Cliente[]> {
    const entities = await this.clienteRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ClienteMapper.toDomain(entity));
  }

  async findById(id: Cliente['id']): Promise<NullableType<Cliente>> {
    const entity = await this.clienteRepository.findOne({
      where: { id },
    });

    return entity ? ClienteMapper.toDomain(entity) : null;
  }

  async findByNome(nome: Cliente['nome']): Promise<NullableType<Cliente>> {
    const entity = await this.clienteRepository.findOne({
      where: { nome },
    });

    return entity ? ClienteMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Cliente['id'][]): Promise<Cliente[]> {
    const entities = await this.clienteRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ClienteMapper.toDomain(entity));
  }

  async update(id: Cliente['id'], payload: Partial<Cliente>): Promise<Cliente> {
    const entity = await this.clienteRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.clienteRepository.save(
      this.clienteRepository.create(
        ClienteMapper.toPersistence({
          ...ClienteMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ClienteMapper.toDomain(updatedEntity);
  }

  async remove(id: Cliente['id']): Promise<void> {
    await this.clienteRepository.delete(id);
  }
}
