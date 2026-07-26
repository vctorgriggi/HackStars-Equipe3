import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClienteRepository } from './infrastructure/persistence/cliente.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Cliente } from './domain/cliente';
import { ehViolacaoDeUnique } from '../utils/violacao-unique';

@Injectable()
export class ClientesService {
  constructor(
    // Dependencies here
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async create(createClienteDto: CreateClienteDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.clienteRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      nome: createClienteDto.nome,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.clienteRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Cliente['id']) {
    return this.clienteRepository.findById(id);
  }

  /**
   * Find-or-create pela chave de negocio (`nome`, coluna UNIQUE). E o UNICO
   * caminho de escrita legitimo desta rodada: o vinculo nasce do cliente que
   * o QR/digitacao traz na identidade da peca (CRUD de escrita esta fechado
   * no controller). Nome vazio nao chega aqui — ausencia de cliente nao vira
   * cadastro (a sentinela '' do transformador nao e um cliente).
   */
  async buscarOuCriarPorNome(nome: Cliente['nome']): Promise<Cliente> {
    const existente = await this.clienteRepository.findByNome(nome);
    if (existente) {
      return existente;
    }

    try {
      return await this.create({ nome });
    } catch (erro) {
      if (!ehViolacaoDeUnique(erro)) {
        throw erro;
      }
      // Corrida: outro request criou o mesmo cliente entre o find e o insert.
      const concorrente = await this.clienteRepository.findByNome(nome);
      if (!concorrente) {
        throw erro;
      }
      return concorrente;
    }
  }

  findByIds(ids: Cliente['id'][]) {
    return this.clienteRepository.findByIds(ids);
  }

  async update(
    id: Cliente['id'],

    updateClienteDto: UpdateClienteDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.clienteRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      nome: updateClienteDto.nome,
    });
  }

  remove(id: Cliente['id']) {
    return this.clienteRepository.remove(id);
  }
}
