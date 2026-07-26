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

/** Postgres: unique_violation. */
const CODIGO_VIOLACAO_UNIQUE = '23505';

function ehViolacaoDeUnique(erro: unknown): boolean {
  const bruto = erro as
    | { code?: string; driverError?: { code?: string } }
    | null
    | undefined;

  return (
    bruto?.driverError?.code === CODIGO_VIOLACAO_UNIQUE ||
    bruto?.code === CODIGO_VIOLACAO_UNIQUE
  );
}

@Injectable()
export class TransformadoresService {
  constructor(
    private readonly projetoModeloService: ProjetosModeloService,

    // Dependencies here
    private readonly transformadorRepository: TransformadorRepository,
  ) {}

  async create(createTransformadorDto: CreateTransformadorDto) {
    // Do not remove comment below.
    // <creating-property />
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
    if (resultado.tipo === 'codigo') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          payloadQr:
            'payload-somente-codigo: lookup nao suportado nesta rodada',
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
      const atualizacao: Record<string, string> = {};
      if (payload.patrimonio && payload.patrimonio !== existente.patrimonio) {
        atualizacao.patrimonio = payload.patrimonio;
      }
      if (payload.cliente && payload.cliente !== existente.cliente) {
        atualizacao.cliente = payload.cliente;
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

    try {
      return await this.create({
        numeroSerie: payload.numeroSerie,
        patrimonio: payload.patrimonio,
        // Coluna NOT NULL: etiqueta sem cliente entra vazia (o QR e a fonte).
        cliente: payload.cliente ?? '',
        pedido: payload.pedido,
        seq: payload.seq,
        descricao: payload.descricao,
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
