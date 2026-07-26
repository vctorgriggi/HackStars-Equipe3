import { ApiProperty } from '@nestjs/swagger';

import { TransformUrlEvidencia } from '../../fotos-evidencia/domain/url-evidencia.transform';
import { ItemChecklist } from '../engine/tipos';
import { ProjetoModelo } from '../../projetos-modelo/domain/projeto-modelo';
import { ehItemChecklist } from '../conferencia-execucao.service';
import {
  DESCRICAO_VEREDITO_CAMPO,
  DESCRICAO_VEREDITO_GERAL,
  VEREDITOS,
} from '../dto/resultado-execucao.dto';
import {
  EtapaResumo,
  TransformadorResumo,
} from '../dto/resumos-compartilhados.dto';

/**
 * Na RELEITURA o veredito vem do banco (coluna `veredito`), sem o `motivo` que
 * so existe na resposta do POST (gap 22 do CLAUDE.md) — daí as duas notas
 * acrescentadas às descrições canônicas da execução.
 */
const DESCRICAO_VEREDITO_CAMPO_PERSISTIDO = DESCRICAO_VEREDITO_CAMPO;
const DESCRICAO_VEREDITO_GERAL_PERSISTIDO =
  DESCRICAO_VEREDITO_GERAL +
  ' Aqui ele vem do banco, como a engine gravou; `incoerencias` e ' +
  '`achadosInconsistentes` NAO sao persistidos e nao voltam nesta rota.';

/**
 * A evidencia de UM campo como a tela de veredito precisa dela.
 *
 * E CLASSE, nao interface, de proposito: `@TransformUrlEvidencia()` so roda
 * quando o class-transformer encontra uma INSTANCIA na resposta (objeto plano
 * nao carrega metadado de decorator). Sem isso, sob `FILE_DRIVER=s3` o front
 * receberia a key crua do bucket em vez da URL assinada — a foto nao abriria e
 * o criterio 1 do SPEC ("cada valor lido com link para sua foto-evidencia")
 * cairia justamente no ambiente da demo.
 *
 * A cadeia que entrega a URL pronta e global (main.ts): ClassSerializerInterceptor
 * aplica o transform (que sob s3 devolve uma PROMISE) e o ResolvePromisesInterceptor,
 * registrado por fora dele, resolve a promise antes de serializar o JSON.
 */
export class FotoEvidenciaResumo {
  @ApiProperty({
    type: String,
    example: 'c0ffee00-1111-2222-3333-444455556666',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'https://trael.s3.us-east-1.amazonaws.com/1e0f2c9d.jpg?X-Amz-...',
    description:
      'URL pronta para uso: driver local → absoluta; driver s3 → ASSINADA E ' +
      'COM VALIDADE DE 1 HORA. Por isso ela nao pode ser persistida em store ' +
      'de longa duracao no cliente — depois de 1h o link devolve 403 e a ' +
      'evidencia some da tela. Recarregue a conferencia para obter uma nova.',
  })
  @TransformUrlEvidencia()
  url: string;

  @ApiProperty({
    type: String,
    example: 'placa',
    description:
      'Vista da peca de onde a foto veio (topo, frente, placa…). Este valor e ' +
      'PERSISTIDO junto da foto — e a procedencia real da evidencia.',
  })
  fonteFisica: string;
}

/** Um campo comparado, do jeito que a engine gravou. */
export class CampoVeredito {
  @ApiProperty({
    type: String,
    example: '1b0e6a4c-52d7-4a1f-9c33-77a2e5b41d90',
    description:
      'Id do CampoConferido — identidade estavel do registro (key de lista).',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'serie-placa',
    description: '`nomeCampo` persistido, ex.: `serie-placa`.',
  })
  campo: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'placa',
    description:
      'Vista esperada do campo, RE-RESOLVIDA da checklist do ProjetoModelo da ' +
      'peca no momento da leitura — `CampoConferido` nao persiste a fonte ' +
      'fisica. `null` quando a peca nao tem projeto vinculado, quando a ' +
      'checklist esta ilegivel ou quando o campo nao aparece mais nela.',
  })
  fonteFisica: string | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    example: true,
    description:
      'Obrigatoriedade do campo, da mesma origem (e com as mesmas ressalvas) ' +
      'de `fonteFisica`. Viaja junto porque e o que explica um ' +
      '`nao_conferivel` que NAO derrubou o veredito geral: campo opcional ' +
      'ilegivel nao bloqueia o conforme (criterio 4 do SPEC).',
  })
  obrigatorio: boolean | null;

  @ApiProperty({
    type: String,
    example: '847233',
    description:
      'Valor que o QR mandava. String VAZIA (nao null) quando o campo nao ' +
      'tinha valor esperado: a coluna e NOT NULL.',
  })
  valorEsperado: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '847833',
    description: 'Valor que a visao leu; `null` quando nao houve leitura.',
  })
  valorLido: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.998,
    description: 'Score 0..1 da leitura que lastreou o veredito.',
  })
  confianca: number | null;

  @ApiProperty({
    enum: VEREDITOS,
    nullable: true,
    example: 'divergente',
    description:
      DESCRICAO_VEREDITO_CAMPO_PERSISTIDO +
      ' O `motivo` do POST NAO e persistido (gap 22): aqui vem o veredito, ' +
      'nao o porque dele.',
  })
  veredito: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '{"Left":0.31,"Top":0.62,"Width":0.12,"Height":0.04}',
    description: 'Bounding box da leitura na foto, quando o extrator forneceu.',
  })
  regiaoLeitura: string | null;

  @ApiProperty({
    type: FotoEvidenciaResumo,
    nullable: true,
    description:
      'Foto que lastreia este campo (criterio 1 do SPEC: cada valor lido com ' +
      'link para sua evidencia). `null` quando a leitura entrou sem foto ' +
      '(leituras digitadas do modo avancado).',
  })
  fotoEvidencia: FotoEvidenciaResumo | null;
}

/** A conferencia relida, com a etapa em que o veredito saiu. */
export class ConferenciaDoVeredito {
  @ApiProperty({
    type: String,
    example: 'a4f9c1d2-7b3e-4c58-9de0-1f2a3b4c5d6e',
  })
  id: string;

  @ApiProperty({
    enum: VEREDITOS,
    nullable: true,
    example: 'divergente',
    description: DESCRICAO_VEREDITO_GERAL_PERSISTIDO,
  })
  vereditoGeral: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Excecao aceita pelo time, justificada — o aceite auditavel de uma ' +
      'conferencia divergente. `null` quando ninguem registrou nada.',
  })
  observacao: string | null;

  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Etapa em que o veredito saiu; `null` = conferencia da checklist ' +
      'inteira. CONFERENCIA PARCIAL: com etapa preenchida, `conforme` vale so ' +
      'para o recorte daquele gate — nao atesta a peca inteira (gap 14).',
  })
  checkpoint: EtapaResumo | null;
}

/**
 * Releitura completa de uma conferencia: o mesmo veredito campo a campo que a
 * resposta do POST devolveu, remontavel a qualquer momento (refresh, navegacao
 * entre telas, abertura pelo historico).
 */
export class VereditoConferencia {
  @ApiProperty({ type: ConferenciaDoVeredito })
  conferencia: ConferenciaDoVeredito;

  @ApiProperty({ type: TransformadorResumo })
  transformador: TransformadorResumo;

  @ApiProperty({
    type: [CampoVeredito],
    description:
      'Campos na ORDEM da checklist do ProjetoModelo (campo que nao esta mais ' +
      'na checklist vai para o fim, com a ordem estavel do banco).',
  })
  campos: CampoVeredito[];
}

/** O que a checklist sabe sobre um campo, indexado por nome. */
export interface ReferenciaDaChecklist {
  /** Posicao na checklist — define a ordem de exibicao dos campos. */
  ordem: number;
  fonteFisica: string;
  obrigatorio: boolean;
}

/**
 * Indexa a checklist do ProjetoModelo por nome de campo para devolver
 * `fonteFisica`, `obrigatorio` e a ORDEM de exibicao na releitura.
 *
 * Tolerante por design, ao contrario do `lerChecklist` da execucao (que estoura
 * 500 em checklist malformada): aqui e uma consulta de LEITURA de veredito ja
 * emitido. Checklist quebrada nao pode derrubar a tela que mostra a nao
 * conformidade — ela so degrada `fonteFisica`/`obrigatorio` para `null` e a
 * ordem para a do banco. A validacao de item continua sendo a UNICA do sistema
 * (`ehItemChecklist`, reusada daqui).
 */
export function indexarChecklist(
  projetoModelo: ProjetoModelo | null | undefined,
): Map<string, ReferenciaDaChecklist> {
  const indice = new Map<string, ReferenciaDaChecklist>();

  if (!projetoModelo?.checklist) {
    return indice;
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(projetoModelo.checklist);
  } catch {
    return indice;
  }

  if (!Array.isArray(bruto)) {
    return indice;
  }

  bruto.forEach((item: unknown, ordem: number) => {
    if (!ehItemChecklist(item)) {
      return;
    }
    // Primeira ocorrencia vence — mesma convencao de `coerencia.ts` para
    // checklist com o campo repetido.
    if (indice.has(item.campo)) {
      return;
    }
    const valido: ItemChecklist = item;
    indice.set(valido.campo, {
      ordem,
      fonteFisica: valido.fonteFisica,
      obrigatorio: valido.obrigatorio,
    });
  });

  return indice;
}
