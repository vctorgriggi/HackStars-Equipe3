import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventoPassagemEntity } from '../entities/evento-passagem.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { EventoPassagem } from '../../../../domain/evento-passagem';
import { EventoPassagemRepository } from '../../evento-passagem.repository';
import { EventoPassagemMapper } from '../mappers/evento-passagem.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class EventoPassagemRelationalRepository implements EventoPassagemRepository {
  constructor(
    @InjectRepository(EventoPassagemEntity)
    private readonly eventoPassagemRepository: Repository<EventoPassagemEntity>,
  ) {}

  async create(data: EventoPassagem): Promise<EventoPassagem> {
    const persistenceModel = EventoPassagemMapper.toPersistence(data);
    const newEntity = await this.eventoPassagemRepository.save(
      this.eventoPassagemRepository.create(persistenceModel),
    );
    return EventoPassagemMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<EventoPassagem[]> {
    const entities = await this.eventoPassagemRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => EventoPassagemMapper.toDomain(entity));
  }

  async findById(
    id: EventoPassagem['id'],
  ): Promise<NullableType<EventoPassagem>> {
    const entity = await this.eventoPassagemRepository.findOne({
      where: { id },
    });

    return entity ? EventoPassagemMapper.toDomain(entity) : null;
  }

  async findByIds(ids: EventoPassagem['id'][]): Promise<EventoPassagem[]> {
    const entities = await this.eventoPassagemRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => EventoPassagemMapper.toDomain(entity));
  }

  async update(
    id: EventoPassagem['id'],
    payload: Partial<EventoPassagem>,
  ): Promise<EventoPassagem> {
    const entity = await this.eventoPassagemRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.eventoPassagemRepository.save(
      this.eventoPassagemRepository.create(
        EventoPassagemMapper.toPersistence({
          ...EventoPassagemMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return EventoPassagemMapper.toDomain(updatedEntity);
  }

  async remove(id: EventoPassagem['id']): Promise<void> {
    await this.eventoPassagemRepository.delete(id);
  }
}
