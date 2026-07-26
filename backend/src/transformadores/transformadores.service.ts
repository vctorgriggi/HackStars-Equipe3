import { ClientesService } from '../clientes/clientes.service';
import { Cliente } from '../clientes/domain/cliente';

import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';
import { ProjetoModelo } from '../projetos-modelo/domain/projeto-modelo';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateTransformadorDto } from './dto/create-transformador.dto';
import { UpdateTransformadorDto } from './dto/update-transformador.dto';
import {
  FiltroTransformador,
  TransformadorRepository,
} from './infrastructure/persistence/transformador.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Transformador } from './domain/transformador';
import {
  PayloadEtiqueta,
  PayloadInvalidoError,
  ResultadoParse,
} from './qr/payload-etiqueta';
import { parsePayloadEtiqueta } from './qr/qr-payload.parser';
import { ehViolacaoDeUnique } from '../utils/violacao-unique';

@Injectable()
export class TransformadoresService {
  constructor(
    private readonly clienteService: ClientesService,

    private readonly projetoModeloService: ProjetosModeloService,

    // Dependencies here
    private readonly transformadorRepository: TransformadorRepository,
  ) {}

  async create(createTransformadorDto: CreateTransformadorDto) {
    // Do not remove comment below.
    // <creating-property />
    let clienteVinculado: Cliente | null | undefined = undefined;

    if (createTransformadorDto.clienteVinculado) {
      const clienteVinculadoObject = await this.clienteService.findById(
        createTransformadorDto.clienteVinculado.id,
      );
      if (!clienteVinculadoObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            clienteVinculado: 'notExists',
          },
        });
      }
      clienteVinculado = clienteVinculadoObject;
    } else if (createTransformadorDto.clienteVinculado === null) {
      clienteVinculado = null;
    }

    let projetoModelo: ProjetoModelo | null | undefined = undefined;

    if (createTransformadorDto.projetoModelo) {
      const projetoModeloObject = await this.projetoModeloService.findById(
        createTransformadorDto.projetoModelo.id,
      );
      if (!projetoModeloObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            projetoModelo: 'notExists',
          },
        });
      }
      projetoModelo = projetoModeloObject;
    } else if (createTransformadorDto.projetoModelo === null) {
      projetoModelo = null;
    }

    return this.transformadorRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      clienteVinculado,

      projetoModelo,

      descricao: createTransformadorDto.descricao,

      cliente: createTransformadorDto.cliente,

      seq: createTransformadorDto.seq,

      pedido: createTransformadorDto.pedido,

      patrimonio: createTransformadorDto.patrimonio,

      numeroSerie: createTransformadorDto.numeroSerie,
    });
  }

  findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: FiltroTransformador | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.transformadorRepository.findAllWithPagination({
      filterOptions,
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Transformador['id']) {
    return this.transformadorRepository.findById(id);
  }

  findByIds(ids: Transformador['id'][]) {
    return this.transformadorRepository.findByIds(ids);
  }

  // Chave de negocio da peca: usada pelo find-or-create da execucao de
  // conferencia (o QR traz numero de serie, nunca o id interno).
  findByNumeroSerie(numeroSerie: Transformador['numeroSerie']) {
    return this.transformadorRepository.findByNumeroSerie(numeroSerie);
  }

  /**
   * Parser do QR + traducao dos erros para 422. Mora aqui porque a identidade
   * esperada e assunto deste modulo (CLAUDE.md: "transformadores — parser do
   * payload do QR e cadastro da identidade esperada"); quem le QR (conferencia,
   * passagem) consome, nunca reimplementa.
   */
  lerPayloadDoQr(payloadQr: string): PayloadEtiqueta {
    let resultado: ResultadoParse;

    try {
      resultado = parsePayloadEtiqueta(payloadQr);
    } catch (erro) {
      if (erro instanceof PayloadInvalidoError) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            payloadQr: erro.motivo,
          },
        });
      }
      throw erro;
    }

    // QR so com codigo de lookup: o fallback de digitacao manual e do front.
    // Medido em 2026-07-26, o QR da ETIQUETA — o que o fluxo manda ler — e
    // exatamente isso (13 digitos, sem campo nenhum), entao esta mensagem e o
    // que o operador REALMENTE ve, nao um canto raro. Por isso ela aponta a
    // saida em vez de so nomear a limitacao. Prefixo `payload-somente-codigo`
    // e contrato: a /demo traduz o erro casando esse pedaco por substring.
    if (resultado.tipo === 'codigo') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          payloadQr:
            'payload-somente-codigo: o QR traz apenas um codigo de lookup; ' +
            'digite os campos da etiqueta manualmente ' +
            '(lookup automatico e rodada futura)',
        },
      });
    }

    return resultado.dados;
  }

  /**
   * Find-or-create pela chave de negocio (`numeroSerie`, coluna UNIQUE);
   * patrimonio NUNCA e chave (numeracao do cliente, unica so por cliente —
   * SPEC, decisoes em aberto).
   *
   * O QR e a fonte da verdade (SPEC, constraint 5): etiqueta com dado
   * diferente do registro ATUALIZA o registro, senao a resposta exibiria o
   * valor antigo enquanto a comparacao usa o novo (revisao R1).
   *
   * REGRA UNICA: a copia privada que vivia em `ConferenciaExecucaoService`
   * (`buscarOuCriarTransformador`) foi apagada — a execucao delega para este
   * metodo, inclusive nos testes, que usam a implementacao real com os
   * colaboradores dublados. Nao recriar a copia.
   */
  async buscarOuCriarPorPayload(
    payload: PayloadEtiqueta,
    existentePreResolvido?: Transformador | null,
  ): Promise<Transformador> {
    const existente =
      existentePreResolvido !== undefined
        ? existentePreResolvido
        : await this.findByNumeroSerie(payload.numeroSerie);

    if (existente) {
      const atualizacao: UpdateTransformadorDto = {};
      if (payload.patrimonio && payload.patrimonio !== existente.patrimonio) {
        atualizacao.patrimonio = payload.patrimonio;
      }
      if (payload.cliente && payload.cliente !== existente.cliente) {
        atualizacao.cliente = payload.cliente;
        // O cadastro segue o texto do QR: cliente novo no payload realinha o
        // vinculo (o registro antigo de Cliente permanece, so o vinculo muda).
        atualizacao.clienteVinculado = {
          id: (await this.clienteService.buscarOuCriarPorNome(payload.cliente))
            .id,
        };
      }
      if (payload.pedido && payload.pedido !== existente.pedido) {
        atualizacao.pedido = payload.pedido;
      }
      if (Object.keys(atualizacao).length === 0) {
        return existente;
      }
      const atualizado = await this.update(existente.id, atualizacao);
      return atualizado ?? existente;
    }

    // Ausencia nao e afirmacao: etiqueta sem cliente cria a peca sem vinculo
    // (e com a sentinela '' na coluna NOT NULL), nunca um cliente vazio.
    const clienteVinculado = payload.cliente
      ? {
          id: (await this.clienteService.buscarOuCriarPorNome(payload.cliente))
            .id,
        }
      : undefined;

    try {
      return await this.create({
        numeroSerie: payload.numeroSerie,
        patrimonio: payload.patrimonio,
        // Coluna NOT NULL: etiqueta sem cliente entra vazia (o QR e a fonte).
        cliente: payload.cliente ?? '',
        pedido: payload.pedido,
        seq: payload.seq,
        descricao: payload.descricao,
        clienteVinculado,
      });
    } catch (erro) {
      if (!ehViolacaoDeUnique(erro)) {
        throw erro;
      }
      // Corrida: outro request criou a mesma peca entre o find e o insert.
      const concorrente = await this.findByNumeroSerie(payload.numeroSerie);
      if (!concorrente) {
        throw erro;
      }
      return concorrente;
    }
  }

  async update(
    id: Transformador['id'],

    updateTransformadorDto: UpdateTransformadorDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let clienteVinculado: Cliente | null | undefined = undefined;

    if (updateTransformadorDto.clienteVinculado) {
      const clienteVinculadoObject = await this.clienteService.findById(
        updateTransformadorDto.clienteVinculado.id,
      );
      if (!clienteVinculadoObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            clienteVinculado: 'notExists',
          },
        });
      }
      clienteVinculado = clienteVinculadoObject;
    } else if (updateTransformadorDto.clienteVinculado === null) {
      clienteVinculado = null;
    }

    let projetoModelo: ProjetoModelo | null | undefined = undefined;

    if (updateTransformadorDto.projetoModelo) {
      const projetoModeloObject = await this.projetoModeloService.findById(
        updateTransformadorDto.projetoModelo.id,
      );
      if (!projetoModeloObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            projetoModelo: 'notExists',
          },
        });
      }
      projetoModelo = projetoModeloObject;
    } else if (updateTransformadorDto.projetoModelo === null) {
      projetoModelo = null;
    }

    return this.transformadorRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      clienteVinculado,

      projetoModelo,

      descricao: updateTransformadorDto.descricao,

      cliente: updateTransformadorDto.cliente,

      seq: updateTransformadorDto.seq,

      pedido: updateTransformadorDto.pedido,

      patrimonio: updateTransformadorDto.patrimonio,

      numeroSerie: updateTransformadorDto.numeroSerie,
    });
  }

  remove(id: Transformador['id']) {
    return this.transformadorRepository.remove(id);
  }
}
