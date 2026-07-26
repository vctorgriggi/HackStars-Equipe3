import { ApiProperty } from '@nestjs/swagger';

import { CheckpointResumo, EtapaResumo } from './resumos-compartilhados.dto';
import { VEREDITOS } from './resultado-execucao.dto';

/**
 * Resposta de `GET /conferencias/indicadores`: a LEITURA AGREGADA do que a
 * engine já gravou — dashboard de linha (T5.1) e indicadores de auditoria
 * (T5.2) do SPEC, num payload só.
 *
 * TRÊS COISAS QUE ESTE ENDPOINT NÃO FAZ, e é por isso que ele pode existir sem
 * ferir a regra de ouro:
 *
 * 1. não compara nada e não recalcula veredito nenhum. Cada número aqui é
 *    `COUNT(*)` sobre `conferencia.vereditoGeral` e `campo_conferido.veredito`
 *    — as colunas que só `CamposConferidosService.criarComVeredito` e a
 *    execução escrevem. Mudar a agregação nunca muda um veredito;
 * 2. não escreve. É consulta pura (SELECT/GROUP BY), sem efeito colateral e
 *    sem chamada de visão — nenhum crédito AWS é gasto para abrir o dashboard;
 * 3. não decide o que é "peça aprovada". Ver o aviso de cobertura no
 *    `vereditoGeral` abaixo (gap 14 do CLAUDE.md).
 *
 * Classes, não interfaces, pelo motivo de sempre: interface some na compilação
 * e a rota chegaria ao front com schema de resposta vazio.
 */

/**
 * Teto de peças em `linha`. Não é paginação — é a trava que impede o dashboard
 * de virar um `SELECT *` da fábrica inteira quando o banco crescer. Nesta
 * rodada (volume de demo) ele nunca é atingido; quando for, `totais.pecas`
 * continua contando TODAS e a diferença para `linha.length` denuncia o corte.
 */
export const TETO_PECAS_NA_LINHA = 200;

export const DESCRICAO_CONTAGEM_POR_VEREDITO =
  'Contagem do que a engine GRAVOU — nenhum recálculo acontece nesta rota. ' +
  'A soma dos três pode ser MENOR que o total do grupo: linha crua criada ' +
  'pelo `POST /conferencias` (CRUD gerado) não tem veredito, e veredito ' +
  'desconhecido é ignorado em vez de ser somado a um balde qualquer.';

export class TotaisIndicadores {
  @ApiProperty({
    type: Number,
    example: 12,
    description:
      'Conferências existentes no banco, com ou sem veredito. É o ' +
      'denominador honesto: `divergentes + naoConferiveis + conformes` pode ' +
      'ser menor (linhas cruas do CRUD, sem veredito).',
  })
  conferencias: number;

  @ApiProperty({
    type: Number,
    example: 4,
    description:
      'Conferências com `vereditoGeral = divergente`. No fluxo TRAEL cada uma ' +
      'delas parou (ou deveria ter parado) a produção até correção.',
  })
  divergentes: number;

  @ApiProperty({
    type: Number,
    example: 3,
    description:
      'Conferências com `vereditoGeral = nao_conferivel`: a API se recusou a ' +
      'afirmar. Não é sinônimo de peça ruim — é foto/leitura sem lastro (ou ' +
      'marcação em relevo sem corroboração) esperando olho humano.',
  })
  naoConferiveis: number;

  @ApiProperty({
    type: Number,
    example: 5,
    description:
      'Conferências com `vereditoGeral = conforme`. LEIA JUNTO de `porEtapa`: ' +
      'conforme de gate parcial não atesta a peça inteira (gap 14).',
  })
  conformes: number;

  @ApiProperty({
    type: Number,
    example: 7,
    description:
      'Transformadores cadastrados (find-or-create pelo número de série do ' +
      'QR). Conta TODOS, mesmo os que o teto de `linha` deixou de fora.',
  })
  pecas: number;

  @ApiProperty({
    type: Number,
    example: 21,
    description: 'Passagens registradas (peça × checkpoint × timestamp).',
  })
  passagens: number;
}

/** Divergências (e o resto) de UMA etapa da linha — o "onde dói". */
export class IndicadorPorEtapa {
  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Etapa em que as conferências deste grupo saíram. `null` agrupa as ' +
      'conferências SEM checkpoint — as da peça inteira (disparadas sem ' +
      '`etapaCodigo`) e as de etapa não cadastrada. Vem por último na lista ' +
      'de propósito: não é uma posição da linha.',
  })
  etapa: EtapaResumo | null;

  @ApiProperty({
    type: Number,
    example: 2,
    description: DESCRICAO_CONTAGEM_POR_VEREDITO,
  })
  divergentes: number;

  @ApiProperty({ type: Number, example: 1 })
  naoConferiveis: number;

  @ApiProperty({ type: Number, example: 5 })
  conformes: number;
}

/** O "quais campos mais dão problema", agregado sobre `campo_conferido`. */
export class IndicadorPorCampo {
  @ApiProperty({
    type: String,
    example: 'serie-placa',
    description:
      'Nome do campo como a conferência o gravou (`serie-placa`, ' +
      '`serie-chumbada-topo`, `patrimonio-serigrafia-frente`…). Campo que ' +
      'saiu da checklist de um modelo continua aparecendo aqui enquanto ' +
      'houver histórico dele — é indicador de auditoria, não a checklist ' +
      'vigente.',
  })
  campo: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: DESCRICAO_CONTAGEM_POR_VEREDITO,
  })
  divergentes: number;

  @ApiProperty({
    type: Number,
    example: 6,
    description:
      'Quantas vezes o campo não pôde ser afirmado. Alto aqui costuma ser ' +
      'problema de CAPTURA (vista difícil, relevo sem corroboração), não de ' +
      'peça — o PORQUÊ (`motivo`) não é persistido nesta rodada (gap 22).',
  })
  naoConferiveis: number;

  @ApiProperty({ type: Number, example: 40 })
  conformes: number;
}

/** Onde a peça está: a última passagem registrada. */
export class UltimaPassagemNaLinha {
  @ApiProperty({
    type: CheckpointResumo,
    description:
      'Checkpoint do último scan. A posição da peça na linha é DERIVADA da ' +
      'última passagem — não existe coluna de posição atual (SPEC).',
  })
  checkpoint: CheckpointResumo;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
    description: 'Timestamp da passagem.',
  })
  em: string;
}

/** Como a peça está: o veredito vigente, do jeito que a engine o gravou. */
export class UltimaConferenciaNaLinha {
  @ApiProperty({
    enum: VEREDITOS,
    nullable: true,
    example: 'divergente',
    description:
      'Veredito da conferência mais recente da peça, exatamente como está no ' +
      'banco — o front nunca recalcula. `null` só em linha crua do CRUD ' +
      '(criada sem passar pela engine).\n\n' +
      'ATENÇÃO (gap 14 do CLAUDE.md): `conforme` COM `etapa` preenchida ' +
      'atesta apenas o recorte daquele gate, nunca a peça completa — a ' +
      'conferência não persiste marca de cobertura. Por isso a etapa viaja ' +
      'colada ao veredito: exibir um sem o outro produz o falso OK que a ' +
      'regra de ouro proíbe.',
  })
  veredito: string | null;

  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Etapa em que esse veredito saiu; `null` = conferência da checklist ' +
      'inteira (disparada sem `etapaCodigo`).',
  })
  etapa: EtapaResumo | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:40:02.101Z',
    description: 'Timestamp da conferência.',
  })
  em: string;
}

/** Uma linha do dashboard: peça × onde está × como está. */
export class PecaNaLinha {
  @ApiProperty({
    type: String,
    example: '3f6d1b2e-9c4a-4f5b-8a7d-2e1c0b9a8f7e',
    description:
      'Id do Transformador — abra `GET /transformadores/{id}/passagens` e ' +
      '`/conferencias` para o histórico completo da peça.',
  })
  transformadorId: string;

  @ApiProperty({
    type: String,
    example: '847233',
    description: 'Chave de negócio da peça (série do fabricante).',
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '251328',
    description:
      'Numeração do cliente. Pode vir string vazia quando a etiqueta não ' +
      'trazia o dado; nunca serve de chave.',
  })
  patrimonio: string | null;

  @ApiProperty({
    type: UltimaPassagemNaLinha,
    nullable: true,
    description:
      'Último scan da peça; `null` = peça cadastrada por conferência, que ' +
      'ainda não registrou passagem em checkpoint nenhum.',
  })
  ultimaPassagem: UltimaPassagemNaLinha | null;

  @ApiProperty({
    type: UltimaConferenciaNaLinha,
    nullable: true,
    description:
      'Veredito vigente da peça; `null` = peça que só passou por checkpoints ' +
      'e nunca foi conferida. `null` NÃO é "sem problema": é ausência de ' +
      'conferência, e a tela precisa dizer isso com todas as letras.',
  })
  ultimaConferencia: UltimaConferenciaNaLinha | null;
}

export class Indicadores {
  @ApiProperty({
    type: TotaisIndicadores,
    description: 'Os números de capa do dashboard.',
  })
  totais: TotaisIndicadores;

  @ApiProperty({
    type: [IndicadorPorEtapa],
    description:
      'Conferências agrupadas pelo CHECKPOINT DA CONFERÊNCIA (a etapa em que ' +
      'o veredito saiu), na ordem da linha (`ordem` crescente, `codigo` de ' +
      'desempate — `ordem` não tem unique, gap 15). O grupo `etapa: null` ' +
      '("peça inteira") fecha a lista. Responde ao "em qual etapa a não ' +
      'conformidade é acusada".',
  })
  porEtapa: IndicadorPorEtapa[];

  @ApiProperty({
    type: [IndicadorPorCampo],
    description:
      'Campos conferidos agrupados por nome, com a contagem de cada veredito ' +
      '— o "quais campos mais dão problema". ORDEM É CONTRATO: divergentes ' +
      'desc, depois não conferíveis desc, depois nome — o topo da lista é ' +
      'onde investigar primeiro. Agrega TODAS as conferências, de todas as ' +
      'etapas e peças.',
  })
  porCampo: IndicadorPorCampo[];

  @ApiProperty({
    type: [PecaNaLinha],
    description:
      'O dashboard de linha: uma entrada por peça, com onde ela está ' +
      '(última passagem) e como ela está (último veredito). Ordenada pela ' +
      'passagem mais recente primeiro; peça sem passagem vai para o fim, ' +
      'desempatada pela conferência mais recente e depois pelo número de ' +
      'série.\n\n' +
      `SEM PAGINAÇÃO nesta rodada (volume de demo): a lista traz no máximo ` +
      `${TETO_PECAS_NA_LINHA} peças. \`totais.pecas\` conta TODAS — se ele ` +
      'for maior que o tamanho desta lista, houve corte no teto e a tela ' +
      'precisa dizer isso em vez de fingir que a fábrica cabe aqui.',
  })
  linha: PecaNaLinha[];
}
