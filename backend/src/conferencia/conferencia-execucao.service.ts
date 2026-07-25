import {
  // common
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CampoConferidosService } from '../campo-conferidos/campo-conferidos.service';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { ProjetoModelosService } from '../projeto-modelos/projeto-modelos.service';
import { TransformadorsService } from '../transformadors/transformadors.service';

import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { ProjetoModelo } from '../projeto-modelos/domain/projeto-modelo';
import { Transformador } from '../transformadors/domain/transformador';

import {
  PayloadEtiqueta,
  PayloadInvalidoError,
  ResultadoParse,
} from '../transformadors/qr/payload-etiqueta';
import { parsePayloadEtiqueta } from '../transformadors/qr/qr-payload.parser';

import { conferir } from './engine/engine-conformidade';
import { ItemChecklist, LeituraCampo, ResultadoCampo } from './engine/tipos';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';
import { ConferenciaRepository } from './infrastructure/persistence/conferencia.repository';

/**
 * Limiar usado quando o cliente nao manda `limiarConfianca`. Fica aqui (borda),
 * nunca dentro da engine: politica e parametro, nao constante enterrada.
 */
export const LIMIAR_CONFIANCA_PADRAO = 0.8;

/** Postgres: unique_violation. */
const CODIGO_VIOLACAO_UNIQUE = '23505';

export interface CampoExecutado extends ResultadoCampo {
  campoConferidoId: string;
}

export interface ResultadoExecucao {
  conferencia: {
    id: string;
    vereditoGeral: string;
    createdAt: Date;
    checkpoint: { codigo: string; nome: string } | null;
  };
  transformador: {
    id: string;
    numeroSerie: string;
    patrimonio: string;
    cliente: string;
    projetoModeloCodigo: string;
  };
  campos: CampoExecutado[];
}

/**
 * De onde sai o valor esperado de cada campo do checklist, por PREFIXO do nome
 * do campo (o sufixo diz a fonte fisica: '-placa', '-serigrafia',
 * '-chumbada-1'...). Nesta rodada o esperado vem so do QR da etiqueta.
 *
 * 'potencia-*' NAO aparece de proposito: a potencia nao esta no QR — o
 * esperado virá do projeto estruturado no futuro. Sem valor esperado, a engine
 * omite o campo opcional do resultado e marca o obrigatorio como
 * 'nao_conferivel' (motivo 'sem-valor-esperado').
 */
const ORIGENS_DO_ESPERADO: {
  prefixo: string;
  ler: (payload: PayloadEtiqueta) => string | null;
}[] = [
  { prefixo: 'serie-', ler: (payload) => payload.numeroSerie },
  { prefixo: 'patrimonio-', ler: (payload) => payload.patrimonio },
  { prefixo: 'cliente-', ler: (payload) => payload.cliente },
];

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

function ehItemChecklist(valor: unknown): valor is ItemChecklist {
  const item = valor as Partial<ItemChecklist> | null;

  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.campo === 'string' &&
    item.campo.length > 0 &&
    typeof item.fonteFisica === 'string' &&
    typeof item.obrigatorio === 'boolean'
  );
}

function montarValoresEsperados(
  checklist: ItemChecklist[],
  payload: PayloadEtiqueta,
): Record<string, string> {
  const valoresEsperados: Record<string, string> = {};

  for (const item of checklist) {
    const origem = ORIGENS_DO_ESPERADO.find((atual) =>
      item.campo.startsWith(atual.prefixo),
    );
    if (origem === undefined) {
      continue;
    }

    const valor = origem.ler(payload);
    // Etiqueta sem o dado (ex.: sem cliente) nao vira esperado vazio: o campo
    // fica sem valor esperado e a engine decide o que fazer com ele.
    if (valor === null || valor.trim().length === 0) {
      continue;
    }

    valoresEsperados[item.campo] = valor;
  }

  return valoresEsperados;
}

@Injectable()
export class ConferenciaExecucaoService {
  constructor(
    private readonly transformadorService: TransformadorsService,

    private readonly projetoModeloService: ProjetoModelosService,

    private readonly checkpointService: CheckpointsService,

    private readonly campoConferidoService: CampoConferidosService,

    private readonly conferenciaRepository: ConferenciaRepository,
  ) {}

  /**
   * Costura da conferencia: QR -> peca -> projeto/checklist -> engine ->
   * persistencia. O veredito nasce aqui dentro (engine) e so daqui vai para o
   * banco; nenhuma borda HTTP consegue escreve-lo.
   */
  async executar(dto: ExecutarConferenciaDto): Promise<ResultadoExecucao> {
    const payload = this.lerPayload(dto.payloadQr);

    // Etapa e resolvida antes de qualquer escrita: codigo desconhecido nao
    // pode deixar transformador orfao no banco.
    const checkpoint = await this.resolverCheckpoint(dto.etapaCodigo);

    const transformador = await this.buscarOuCriarTransformador(payload);
    const projetoModelo = await this.resolverProjetoModelo(
      payload,
      transformador,
    );

    if (!transformador.projetoModelo) {
      await this.transformadorService.update(transformador.id, {
        projetoModelo: { id: projetoModelo.id },
      });
      transformador.projetoModelo = projetoModelo;
    }

    const checklist = this.lerChecklist(projetoModelo);
    const leituras: LeituraCampo[] = dto.leituras.map((leitura) => ({
      campo: leitura.campo,
      valorLido: leitura.valorLido ?? null,
      confianca: leitura.confianca ?? null,
      regiaoLeitura: leitura.regiaoLeitura ?? null,
      fotoEvidenciaId: leitura.fotoEvidenciaId ?? null,
    }));

    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload),
      leituras,
      { limiarConfianca: dto.limiarConfianca ?? LIMIAR_CONFIANCA_PADRAO },
    );

    const conferencia = await this.conferenciaRepository.create({
      vereditoGeral: resultado.vereditoGeral,

      checkpoint,

      transformador,
    });

    const campos: CampoExecutado[] = [];
    for (const campo of resultado.campos) {
      const leitura = leituras.find((atual) => atual.campo === campo.campo);
      const campoConferido = await this.campoConferidoService.criarComVeredito({
        conferencia,
        nomeCampo: campo.campo,
        // Coluna NOT NULL: campo obrigatorio sem esperado (nao_conferivel)
        // grava string vazia; o motivo fica no resultado da engine.
        valorEsperado: campo.valorEsperado ?? '',
        valorLido: campo.valorLido,
        confianca: campo.confianca,
        veredito: campo.veredito,
        regiaoLeitura: leitura?.regiaoLeitura ?? null,
        fotoEvidenciaId: leitura?.fotoEvidenciaId ?? null,
      });

      campos.push({ ...campo, campoConferidoId: campoConferido.id });
    }

    return {
      conferencia: {
        id: conferencia.id,
        vereditoGeral: resultado.vereditoGeral,
        createdAt: conferencia.createdAt,
        checkpoint:
          checkpoint === null
            ? null
            : { codigo: checkpoint.codigo, nome: checkpoint.nome },
      },
      transformador: {
        id: transformador.id,
        numeroSerie: transformador.numeroSerie,
        patrimonio: transformador.patrimonio,
        cliente: transformador.cliente,
        projetoModeloCodigo: projetoModelo.codigo,
      },
      campos,
    };
  }

  private lerPayload(payloadQr: string): PayloadEtiqueta {
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

  private async resolverCheckpoint(
    etapaCodigo?: string,
  ): Promise<Checkpoint | null> {
    if (!etapaCodigo) {
      return null;
    }

    const checkpoint = await this.checkpointService.findByCodigo(etapaCodigo);
    if (!checkpoint) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          etapaCodigo: `etapa-desconhecida: ${etapaCodigo}`,
        },
      });
    }

    return checkpoint;
  }

  private async buscarOuCriarTransformador(
    payload: PayloadEtiqueta,
  ): Promise<Transformador> {
    const existente = await this.transformadorService.findByNumeroSerie(
      payload.numeroSerie,
    );
    if (existente) {
      return existente;
    }

    try {
      return await this.transformadorService.create({
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
      const concorrente = await this.transformadorService.findByNumeroSerie(
        payload.numeroSerie,
      );
      if (!concorrente) {
        throw erro;
      }
      return concorrente;
    }
  }

  /**
   * Ordem: codigo do projeto no QR -> vinculo ja existente na peca -> unico
   * projeto cadastrado. Codigo do QR sem cadastro correspondente nao e erro:
   * cai para os proximos criterios.
   */
  private async resolverProjetoModelo(
    payload: PayloadEtiqueta,
    transformador: Transformador,
  ): Promise<ProjetoModelo> {
    if (payload.codigoProjeto) {
      const porCodigo = await this.projetoModeloService.findByCodigo(
        payload.codigoProjeto,
      );
      if (porCodigo) {
        return porCodigo;
      }
    }

    if (transformador.projetoModelo) {
      return transformador.projetoModelo;
    }

    const todos = await this.projetoModeloService.findAll();
    if (todos.length === 1) {
      return todos[0];
    }

    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        projetoModelo: 'projeto-modelo-indeterminado',
      },
    });
  }

  /**
   * checklist e texto JSON na coluna. JSON quebrado e dado corrompido, nao
   * erro do cliente: 500 com mensagem que aponta o projeto.
   */
  private lerChecklist(projetoModelo: ProjetoModelo): ItemChecklist[] {
    let bruto: unknown;

    try {
      bruto = JSON.parse(projetoModelo.checklist);
    } catch {
      throw new InternalServerErrorException(
        `checklist-invalido: JSON malformado no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    if (!Array.isArray(bruto) || bruto.length === 0) {
      throw new InternalServerErrorException(
        `checklist-invalido: esperado array nao vazio no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    if (!bruto.every(ehItemChecklist)) {
      throw new InternalServerErrorException(
        `checklist-invalido: item fora do formato { campo, fonteFisica, obrigatorio } no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    return bruto;
  }
}
