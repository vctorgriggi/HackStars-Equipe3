import {
  // common
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CamposConferidosService } from '../campos-conferidos/campos-conferidos.service';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';
import { TransformadoresService } from '../transformadores/transformadores.service';

import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { ProjetoModelo } from '../projetos-modelo/domain/projeto-modelo';
import { Transformador } from '../transformadores/domain/transformador';

import {
  PayloadEtiqueta,
  PayloadInvalidoError,
  ResultadoParse,
} from '../transformadores/qr/payload-etiqueta';
import { parsePayloadEtiqueta } from '../transformadores/qr/qr-payload.parser';

import { conferir, normalizar } from './engine/engine-conformidade';
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
  /**
   * Etapa que definiu o RECORTE da checklist (null = checklist inteira). O
   * chamador precisa dela para exibir "conferência parcial da etapa X" em vez
   * de dar a conferência como completa.
   */
  etapaAvaliada: { codigo: string; nome: string; ordem: number } | null;
  /**
   * Quantos itens da checklist entraram no recorte. Pode ser MAIOR que
   * `campos.length`: item opcional sem valor esperado é omitido pela engine.
   */
  camposAvaliados: number;
  campos: CampoExecutado[];
}

/** O que o filtro por etapa devolve: o recorte + o que precisou ser relevado. */
export interface RecorteDaEtapa {
  itens: ItemChecklist[];
  /** Etapas citadas por itens que não existem como Checkpoint no banco. */
  etapasDesconhecidas: string[];
}

/**
 * Recorta a checklist para a etapa da conferência. Função pura: recebe a
 * ordem da etapa do request e um mapa `codigo do checkpoint -> ordem`; não
 * toca banco.
 *
 * Regra (CUMULATIVA, de propósito):
 * - `ordemDaEtapa === null` (request sem `etapaCodigo`) → checklist inteira,
 *   o comportamento histórico do endpoint;
 * - item SEM `etapa` → sempre incluído (checklist antiga continua valendo);
 * - item com `etapa` conhecida → incluído quando a ordem dela é MENOR OU
 *   IGUAL à ordem da etapa do request: a marcação já existe na peça naquele
 *   ponto do fluxo. O gate da placa reconfere o chumbado e a serigrafia — é
 *   assim que se detecta troca de peça entre etapas;
 * - item com `etapa` desconhecida (não há Checkpoint com aquele `codigo`) →
 *   incluído, e o código volta em `etapasDesconhecidas` para o chamador
 *   logar. Checklist inconsistente não pode derrubar a conferência, e
 *   silenciar o item seria pior: campo obrigatório sumindo do gate é
 *   exatamente o falso OK que a regra de ouro proíbe.
 */
export function filtrarChecklistPorEtapa(
  checklist: ItemChecklist[],
  ordemDaEtapa: number | null,
  ordensPorCodigo: Map<string, number>,
): RecorteDaEtapa {
  if (ordemDaEtapa === null) {
    return { itens: [...checklist], etapasDesconhecidas: [] };
  }

  const itens: ItemChecklist[] = [];
  const desconhecidas = new Set<string>();

  for (const item of checklist) {
    const etapa = item.etapa?.trim();
    if (etapa === undefined || etapa.length === 0) {
      itens.push(item);
      continue;
    }

    const ordemDoItem = ordensPorCodigo.get(etapa);
    if (ordemDoItem === undefined) {
      desconhecidas.add(etapa);
      itens.push(item);
      continue;
    }

    if (ordemDoItem <= ordemDaEtapa) {
      itens.push(item);
    }
  }

  return { itens, etapasDesconhecidas: [...desconhecidas] };
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

// Exportado por ser a validação ÚNICA de item de checklist — a versão que
// vivia duplicada em conferencia-extracao divergia (não validava `etapa`) e
// deixava checklist ruim pagar visão antes de explodir aqui.
export function ehItemChecklist(valor: unknown): valor is ItemChecklist {
  const item = valor as Partial<ItemChecklist> | null;

  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.campo === 'string' &&
    item.campo.length > 0 &&
    typeof item.fonteFisica === 'string' &&
    typeof item.obrigatorio === 'boolean' &&
    // `etapa` e opcional (checklist antiga nao tem), mas quando existe precisa
    // ser string: outro tipo nunca casaria com o `codigo` do Checkpoint e o
    // item cairia calado no ramo "etapa desconhecida". `null` e aceito como
    // "sem etapa" (codificacao natural em JSON — achado BAIXA da revisao) e
    // normalizado para undefined em lerChecklist.
    (item.etapa == null || typeof item.etapa === 'string')
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
  private readonly logger = new Logger(ConferenciaExecucaoService.name);

  constructor(
    private readonly transformadorService: TransformadoresService,

    private readonly projetoModeloService: ProjetosModeloService,

    private readonly checkpointService: CheckpointsService,

    private readonly campoConferidoService: CamposConferidosService,

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

    const checklistCompleta = this.lerChecklist(projetoModelo);
    // Conferencia PARCIAL por etapa: no gate da adesivacao a placa ainda nem
    // foi fixada — cobra-la devolveria `nao_conferivel` por marcacao
    // inexistente, ruido que some o veredito real. O recorte e cumulativo
    // (ordem do item <= ordem do gate); a regra completa esta em
    // `filtrarChecklistPorEtapa`.
    const checklist = await this.recortarChecklistPorEtapa(
      checklistCompleta,
      checkpoint,
      projetoModelo,
    );

    const limiarConfianca = dto.limiarConfianca ?? LIMIAR_CONFIANCA_PADRAO;
    const leituras = dedupeLeituras(
      dto.leituras.map((leitura) => ({
        campo: leitura.campo,
        valorLido: leitura.valorLido ?? null,
        confianca: leitura.confianca ?? null,
        regiaoLeitura: leitura.regiaoLeitura ?? null,
        fotoEvidenciaId: leitura.fotoEvidenciaId ?? null,
      })),
      limiarConfianca,
    );

    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload),
      leituras,
      { limiarConfianca },
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
      etapaAvaliada:
        checkpoint === null
          ? null
          : {
              codigo: checkpoint.codigo,
              nome: checkpoint.nome,
              ordem: checkpoint.ordem,
            },
      camposAvaliados: checklist.length,
      campos,
    };
  }

  /**
   * Resolve as ordens das etapas citadas pela checklist e aplica o recorte.
   * As buscas ficam num Map local (uma consulta por `codigo` distinto, nao
   * uma por item); a etapa do proprio request ja vem resolvida e entra no
   * cache sem ida ao banco.
   */
  private async recortarChecklistPorEtapa(
    checklist: ItemChecklist[],
    checkpoint: Checkpoint | null,
    projetoModelo: ProjetoModelo,
  ): Promise<ItemChecklist[]> {
    if (checkpoint === null) {
      return checklist;
    }

    const ordensPorCodigo = new Map<string, number>([
      [checkpoint.codigo, checkpoint.ordem],
    ]);

    for (const item of checklist) {
      const etapa = item.etapa?.trim();
      if (
        etapa === undefined ||
        etapa.length === 0 ||
        ordensPorCodigo.has(etapa)
      ) {
        continue;
      }

      const doItem = await this.checkpointService.findByCodigo(etapa);
      if (doItem) {
        ordensPorCodigo.set(doItem.codigo, doItem.ordem);
      }
    }

    const recorte = filtrarChecklistPorEtapa(
      checklist,
      checkpoint.ordem,
      ordensPorCodigo,
    );

    for (const desconhecida of recorte.etapasDesconhecidas) {
      this.logger.warn(
        `checklist-etapa-desconhecida: ProjetoModelo ${projetoModelo.codigo} referencia a etapa '${desconhecida}', que nao existe como Checkpoint; itens dessa etapa foram avaliados assim mesmo`,
      );
    }

    // Recorte vazio jamais vira resposta: a engine devolveria `conforme` com
    // zero campos — o falso OK que a regra de ouro proibe. So acontece com
    // checklist mal configurada (nenhum item conferivel ate esta etapa).
    if (recorte.itens.length === 0) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          etapaCodigo: `etapa-sem-campos-conferiveis: nenhum item da checklist do ProjetoModelo ${projetoModelo.codigo} e conferivel ate a etapa '${checkpoint.codigo}'`,
        },
      });
    }

    return recorte.itens;
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
      // QR é a fonte da verdade (SPEC, constraint 5): se a etiqueta traz
      // dado diferente do registro, o registro é atualizado — antes disso a
      // resposta exibia o valor antigo enquanto a engine comparava contra o
      // novo, sem nenhum sinal de conflito (revisão R1).
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
      if (Object.keys(atualizacao).length > 0) {
        const atualizado = await this.transformadorService.update(
          existente.id,
          atualizacao,
        );
        return atualizado ?? existente;
      }
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

    // etapa: null (aceito pelo guard) vira undefined — downstream só conhece
    // "string presente" ou "ausente".
    return bruto.map((item) => ({ ...item, etapa: item.etapa ?? undefined }));
  }
}

/** Leitura "melhor": valorLido presente vence; empate decide por confiança. */
function melhorLeitura(a: LeituraCampo, b: LeituraCampo): boolean {
  const aTemValor = a.valorLido !== null && a.valorLido.trim().length > 0;
  const bTemValor = b.valorLido !== null && b.valorLido.trim().length > 0;
  if (aTemValor !== bTemValor) {
    return aTemValor;
  }
  return (a.confianca ?? -1) > (b.confianca ?? -1);
}

/**
 * Reconciliação de múltiplas leituras do mesmo campo (dedup da revisão R1 +
 * achado ALTA da rodada de análise): a refoto legítima (leitura nula + leitura
 * legível da mesma fonte) fica com a melhor, mas duas leituras VÁLIDAS (valor
 * presente e confiança >= limiar) que discordam no valor normalizado são um
 * CONFLITO — escolher uma calada dependeria da ordem do array e poderia
 * rebaixar o cenário-âncora a `conforme` (a etiqueta fotografada como "placa"
 * lê melhor que o relevo). Conflito marca a vencedora com `conflitante`; quem
 * rebaixa o veredito é a engine (`leituras-conflitantes`) — o veredito segue
 * nascendo em um lugar só.
 *
 * Exportada para teste direto (mesmo padrão de `filtrarChecklistPorEtapa`).
 */
export function dedupeLeituras(
  candidatas: LeituraCampo[],
  limiarConfianca: number,
): LeituraCampo[] {
  const porCampo = new Map<string, LeituraCampo>();
  const valoresValidos = new Map<string, Set<string>>();

  for (const candidata of candidatas) {
    const atual = porCampo.get(candidata.campo);
    if (!atual || melhorLeitura(candidata, atual)) {
      porCampo.set(candidata.campo, { ...candidata });
    }

    // Só leitura com lastro entra na detecção de conflito: abaixo do limiar
    // (ou sem confiança) é ruído que a engine já barra sozinha — ruído não
    // pode vetar uma leitura boa.
    const valida =
      candidata.valorLido !== null &&
      candidata.valorLido.trim().length > 0 &&
      candidata.confianca !== null &&
      candidata.confianca > 0 &&
      candidata.confianca >= limiarConfianca;
    if (valida) {
      const conjunto =
        valoresValidos.get(candidata.campo) ?? new Set<string>();
      conjunto.add(normalizar(candidata.valorLido as string));
      valoresValidos.set(candidata.campo, conjunto);
    }
  }

  for (const [campo, valores] of valoresValidos) {
    if (valores.size > 1) {
      const vencedora = porCampo.get(campo);
      if (vencedora) {
        vencedora.conflitante = true;
      }
    }
  }

  return [...porCampo.values()];
}
