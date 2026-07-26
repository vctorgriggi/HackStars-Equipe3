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

import { PayloadEtiqueta } from '../transformadores/qr/payload-etiqueta';

import { ehMarcacaoEmRelevo } from '../extracao/ports/marcacao';

import { conferir, normalizar, temLastro } from './engine/engine-conformidade';
import { temConteudo } from './engine/normalizacao';
import { ItemChecklist, LeituraCampo } from './engine/tipos';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';
import {
  CampoExecutado,
  ResultadoExecucao,
} from './dto/resultado-execucao.dto';
import { ConferenciaRepository } from './infrastructure/persistence/conferencia.repository';

/**
 * Limiar usado quando o cliente nao manda `limiarConfianca`. Fica aqui (borda),
 * nunca dentro da engine: politica e parametro, nao constante enterrada.
 *
 * 0.9 e MEDIDO, nao arbitrado (peca real, Textract, 2026-07-25): as leituras
 * corretas sairam entre 98,4% e 99,9%, e o unico erro de digito (2 lido como
 * 8 numa foto lateral do chumbado) veio a 84,6%. Com 0.8 esse erro passava e
 * virava `divergente` FALSO, quebrando o criterio 2 do SPEC ("o unico campo
 * divergente e a serie da placa"); com 0.9 ele vira `nao_conferivel`, que e a
 * resposta honesta — foto ruim vai para o olho humano.
 */
export const LIMIAR_CONFIANCA_PADRAO = 0.9;

/**
 * O contrato de resposta da execução vive em `dto/resultado-execucao.dto.ts`,
 * como CLASSE: interface some na compilação e o Swagger devolvia esta rota —
 * a principal do front — com schema de resposta vazio. Re-exportado daqui para
 * quem já importava do serviço continuar importando do mesmo lugar; a
 * equivalência com os tipos da engine é checada em compilação lá.
 */
export { CampoExecutado, ResultadoExecucao };

/**
 * Tudo que a execução consegue resolver SEM escrever nada e SEM pagar visão:
 * QR, etapa, projeto/checklist e o recorte da etapa. Existe para ser
 * compartilhado — o fluxo com fotos (`ConferenciaExtracaoService`) prepara uma
 * vez, filtra as fotos por este mesmo recorte e devolve o contexto ao
 * `executar`, em vez de resolver projeto por regra própria (achado 12 da
 * revisão) e descobrir o 422 de etapa só depois de N chamadas de Textract
 * (achado 4).
 */
export interface ContextoExecucao {
  payload: PayloadEtiqueta;
  /** Etapa do request já resolvida; null quando a request não fixa etapa. */
  checkpoint: Checkpoint | null;
  projetoModelo: ProjetoModelo;
  /** Checklist do projeto JÁ recortada pela etapa; nunca vazia. */
  checklist: ItemChecklist[];
  /**
   * Peça já cadastrada — find SEM create (leitura pura). `null` significa
   * "ainda não existe"; quem cria é o `executar`, depois de todos os 422.
   */
  transformadorExistente: Transformador | null;
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
 * do campo. O prefixo diz O QUE o campo carrega ('serie-', 'patrimonio-',
 * 'cliente-'); o resto do nome diz como foi gravado e em qual VISTA da peca
 * esta ('serie-chumbada-topo', 'patrimonio-serigrafia-frente', 'serie-placa').
 * Trocar o eixo de `fonteFisica` para vistas nao mexe aqui de proposito: o
 * casamento e por prefixo, entao nome novo de posicao continua achando sua
 * origem. Nesta rodada o esperado vem so do QR da etiqueta.
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

// Exportada para teste direto (mesmo padrao de `filtrarChecklistPorEtapa` e
// `dedupeLeituras`): e ela que decide, entre outras coisas, que 'potencia-*'
// nao tem valor esperado nesta rodada — regra que so aparecia indiretamente,
// pelo veredito de um campo, ate a revisao adversarial (achado M9).
export function montarValoresEsperados(
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
   * Resolve, sem escrever nada, tudo que pode devolver 422: QR, etapa, projeto
   * e recorte da checklist. É a ÚNICA regra de resolução de ProjetoModelo do
   * sistema (achado 12) e o único lugar que decide o recorte da etapa —
   * `executarComFotos` chama isto antes de mandar qualquer byte para a visão.
   *
   * Nenhuma escrita aqui, nem o find-or-create da peça: um 422 de recorte
   * vazio deixava transformador criado no banco (achado 8), contradizendo a
   * promessa de "etapa resolvida antes de qualquer escrita". O vínculo peça →
   * projeto entra na cascata como LEITURA (find sem create).
   */
  async prepararExecucao(dto: {
    payloadQr: string;
    etapaCodigo?: string;
  }): Promise<ContextoExecucao> {
    const payload = this.transformadorService.lerPayloadDoQr(dto.payloadQr);

    // Etapa e resolvida antes de qualquer escrita: codigo desconhecido nao
    // pode deixar transformador orfao no banco.
    const checkpoint = await this.resolverCheckpoint(dto.etapaCodigo);

    const transformadorExistente =
      await this.transformadorService.findByNumeroSerie(payload.numeroSerie);

    const projetoModelo = await this.resolverProjetoModelo(
      payload,
      transformadorExistente,
    );

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

    return {
      payload,
      checkpoint,
      projetoModelo,
      checklist,
      transformadorExistente,
    };
  }

  /**
   * Costura da conferencia: QR -> peca -> projeto/checklist -> engine ->
   * persistencia. O veredito nasce aqui dentro (engine) e so daqui vai para o
   * banco; nenhuma borda HTTP consegue escreve-lo.
   *
   * `contexto` só é passado por quem JÁ chamou `prepararExecucao` com o MESMO
   * `payloadQr`/`etapaCodigo` (hoje, o fluxo com fotos): reaproveitar evita a
   * dupla leitura de projeto/checklist e garante que a visão leu exatamente a
   * checklist que a engine vai avaliar.
   */
  async executar(
    dto: ExecutarConferenciaDto,
    contexto?: ContextoExecucao,
  ): Promise<ResultadoExecucao> {
    const preparado = contexto ?? (await this.prepararExecucao(dto));
    const { payload, checkpoint, projetoModelo, checklist } = preparado;

    // A ENGINE RODA ANTES DA PRIMEIRA ESCRITA. E lógica pura (checklist +
    // payload + leituras), então nada obriga a pagá-la depois de criar a peça —
    // e rodá-la antes é o que permite recusar um resultado vazio sem deixar
    // Transformador órfão (mesma promessa do achado 8, agora para o AVALIADO).
    const limiarConfianca = dto.limiarConfianca ?? LIMIAR_CONFIANCA_PADRAO;
    const leituras = exigirCorroboracaoDeRelevo(
      dedupeLeituras(
        dto.leituras.map((leitura) => ({
          campo: leitura.campo,
          valorLido: leitura.valorLido ?? null,
          confianca: leitura.confianca ?? null,
          regiaoLeitura: leitura.regiaoLeitura ?? null,
          fotoEvidenciaId: leitura.fotoEvidenciaId ?? null,
          corroboracao: leitura.corroboracao,
        })),
        limiarConfianca,
      ),
    );

    const valoresEsperados = montarValoresEsperados(checklist, payload);
    const resultado = conferir(
      checklist,
      valoresEsperados,
      marcarLeiturasTrocadas(leituras, valoresEsperados, limiarConfianca),
      { limiarConfianca },
    );

    // Recorte NAO VAZIO que mesmo assim nao avaliou campo nenhum: todos os
    // itens eram opcionais SEM valor esperado no QR e a engine os omitiu. A
    // guarda do recorte (`recorte.itens.length === 0`) media a lista de
    // ENTRADA e nao pegava este caso (achado A1). Gravar seria pior que 422:
    // ficaria uma conferencia sem campo nenhum, e conferencia sem campo e a
    // pergunta "esta peca esta conforme?" respondida sem olhar a peca.
    if (resultado.campos.length === 0) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          checklist:
            `checklist-sem-campo-avaliavel: nenhum item conferivel do ` +
            `ProjetoModelo ${projetoModelo.codigo} produziu campo avaliavel ` +
            `(itens opcionais sem valor esperado no QR)`,
        },
      });
    }

    // Ultimo 422 possivel, e por isso o ultimo passo antes da escrita: foto
    // emprestada de OUTRA conferencia (achado A2). A mesma recusa acontecia no
    // fim da linha, dentro de `criarComVeredito`, ja com a conferencia criada e
    // N campos gravados — sobrava conferencia orfa com campos parciais, que o
    // scan de passagem ainda leria como "ultima conferencia" da peca.
    await this.campoConferidoService.validarEvidenciasDisponiveis(
      leituras
        .map((leitura) => leitura.fotoEvidenciaId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    // Primeira escrita do fluxo: daqui para baixo, nenhum 422.
    const transformador =
      await this.transformadorService.buscarOuCriarPorPayload(
        payload,
        preparado.transformadorExistente,
      );

    if (!transformador.projetoModelo) {
      await this.transformadorService.update(transformador.id, {
        projetoModelo: { id: projetoModelo.id },
      });
      transformador.projetoModelo = projetoModelo;
    }

    const conferencia = await this.conferenciaRepository.create({
      vereditoGeral: resultado.vereditoGeral,

      checkpoint,

      transformador,
    });

    for (const incoerencia of resultado.incoerencias) {
      this.logger.warn(
        `incoerencia-entre-campos: conferencia ${conferencia.id} — ` +
          `${incoerencia.campos.join(', ')} deveriam carregar ` +
          `"${incoerencia.valorEsperado}" e leram valores diferentes entre si ` +
          `(${incoerencia.valoresLidos.join(' x ')}); veredito geral ` +
          `${resultado.vereditoGeral}`,
      );
    }

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
      incoerencias: resultado.incoerencias,
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

  /**
   * Ordem: codigo do projeto no QR -> vinculo ja existente na peca -> unico
   * projeto cadastrado. Codigo do QR sem cadastro correspondente nao e erro:
   * cai para os proximos criterios.
   *
   * `transformador` é `null` quando a peça ainda não existe (primeiro scan) —
   * a cascata simplesmente pula o critério do vínculo. É a REGRA ÚNICA do
   * sistema: antes, `executarComFotos` tinha uma cópia sem o critério do
   * vínculo, e com 2 projetos cadastrados os dois endpoints discordavam
   * (achado 12).
   */
  private async resolverProjetoModelo(
    payload: PayloadEtiqueta,
    transformador: Transformador | null,
  ): Promise<ProjetoModelo> {
    if (payload.codigoProjeto) {
      const porCodigo = await this.projetoModeloService.findByCodigo(
        payload.codigoProjeto,
      );
      if (porCodigo) {
        return porCodigo;
      }
    }

    if (transformador?.projetoModelo) {
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

/**
 * Guarda contra TROCA DE CAMPO (medida em campo, 2026-07-25): numa foto que
 * mostra mais de uma marcação, a heurística do extrator pode casar o número
 * errado com o campo alvo — o caso real foi a foto da tampa, onde o
 * patrimônio SERIGRAFADO (tinta preta, alto contraste) foi lido como a série
 * CHUMBADA (relevo da cor do tanque, quase invisível para o OCR): a única
 * marcação que o Textract enxergou virou a resposta do campo pedido.
 *
 * Regra: leitura que NÃO bate com o esperado do próprio campo mas bate
 * EXATAMENTE com o esperado de outro campo não é divergência — é a marcação
 * do vizinho lida no lugar errado. Vira `nao_conferivel`
 * (`leitura-de-outro-campo`), que manda a foto para o olho humano.
 *
 * Por que isto NÃO fere a regra de ouro (usar o esperado para julgar leitura
 * seria circular): a guarda só sabe DESCONFIAR — todo caminho dela leva a
 * `nao_conferivel`. Nenhuma leitura vira `conforme` por causa dela, e o campo
 * genuinamente divergente (placa 847833 × etiqueta 847233) continua
 * `divergente`, porque 847833 não é o esperado de campo nenhum.
 *
 * SÓ MARCA LEITURA COM LASTRO (achado A3 da revisão adversarial): a marcação
 * roda no ramo (b3) da engine, ANTES do ramo (c) do limiar, então marcar sem
 * lastro sequestrava o motivo. Medido: `251328 @ 0.35` num campo de série saía
 * `leitura-de-outro-campo` — o operador era mandado reenquadrar a foto quando a
 * causa real era foto ruim (35% de confiança). Sem lastro a leitura não afirma
 * nada sobre campo nenhum, nem sobre o vizinho; deixá-la passar entrega o campo
 * ao ramo (c), que dá o motivo honesto `confianca-abaixo-do-limiar`.
 */
export function marcarLeiturasTrocadas(
  leituras: LeituraCampo[],
  valoresEsperados: Record<string, string>,
  limiarConfianca: number,
): LeituraCampo[] {
  return leituras.map((leitura) => {
    const valorLido = leitura.valorLido;
    if (valorLido === null || valorLido.trim().length === 0) {
      return leitura;
    }

    if (!temLastro(leitura.confianca, limiarConfianca)) {
      return leitura;
    }

    const lido = normalizar(valorLido);
    const esperadoDoProprio = valoresEsperados[leitura.campo];
    if (esperadoDoProprio && normalizar(esperadoDoProprio) === lido) {
      return leitura;
    }

    // Primeiro campo cuja expectativa casa. Com irmãos (as 3 chumbadas, os dois
    // patrimônios) todos carregam o MESMO esperado, então qualquer um serve de
    // representante do grupo — vale a ordem da checklist, como em `coerencia`.
    const casado = Object.entries(valoresEsperados).find(
      ([campo, esperado]) =>
        campo !== leitura.campo && normalizar(esperado) === lido,
    );

    return casado === undefined
      ? leitura
      : { ...leitura, trocado: true, campoDaLeitura: casado[0] };
  });
}

/**
 * REGRA "ANTES DE ACUSAR, CONFIRME" aplicada na PORTA DE ENTRADA: toda leitura
 * de marcação em relevo que chega sem corroboração é tratada como
 * `nao-confirmada`.
 *
 * Por que aqui e não só no adapter: o adapter de visão sabe corroborar, mas ele
 * não é a única porta por onde leitura entra. O endpoint de leituras digitadas
 * (`POST /conferencia/executar`, usado pela `/demo` e pelos testes) e o driver
 * `mock` produzem leituras sem segunda evidência nenhuma. Sem esta linha, a
 * mesma peça seria ACUSADA por uma porta e não pela outra — e a porta frouxa
 * seria justamente a que ninguém mede.
 *
 * Fail-safe nos dois sentidos: marcar a mais nunca cria `conforme` (só troca
 * `divergente` por `nao_conferivel`), e leitura VAZIA fica de fora de propósito
 * — campo que ninguém leu não acusa nada, e o motivo honesto dele continua
 * sendo `sem-leitura`, não "não corroborada".
 *
 * A derivação "isto é relevo" vem do NOME do campo (`ehMarcacaoEmRelevo`), com
 * a limitação registrada lá: a checklist ainda não declara tipo de marcação.
 */
export function exigirCorroboracaoDeRelevo(
  leituras: LeituraCampo[],
): LeituraCampo[] {
  return leituras.map((leitura) => {
    if (
      leitura.corroboracao !== undefined ||
      !temConteudo(leitura.valorLido) ||
      !ehMarcacaoEmRelevo(leitura.campo)
    ) {
      return leitura;
    }

    return { ...leitura, corroboracao: 'nao-confirmada' };
  });
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
    // pode vetar uma leitura boa. `temLastro` é A MESMA função que a engine usa
    // no ramo (c): a condição vivia reescrita aqui, com os sinais invertidos, e
    // a decisão em aberto do "campo parcialmente legível" mudaria só um dos dois
    // lugares (achado M1).
    const valida =
      candidata.valorLido !== null &&
      candidata.valorLido.trim().length > 0 &&
      temLastro(candidata.confianca, limiarConfianca);
    if (valida) {
      const conjunto = valoresValidos.get(candidata.campo) ?? new Set<string>();
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
