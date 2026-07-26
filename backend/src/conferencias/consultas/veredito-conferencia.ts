import { ApiProperty } from '@nestjs/swagger';

import { TransformUrlEvidencia } from '../../fotos-evidencia/domain/url-evidencia.transform';
import { ItemChecklist } from '../engine/tipos';
import { ProjetoModelo } from '../../projetos-modelo/domain/projeto-modelo';
import { ehItemChecklist } from '../conferencia-execucao.service';

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
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({
    type: String,
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
    description:
      'Vista da peca de onde a foto veio (topo, frente, placa…). Este valor e ' +
      'PERSISTIDO junto da foto — e a procedencia real da evidencia.',
  })
  fonteFisica: string;
}

/** Um campo comparado, do jeito que a engine gravou. */
export interface CampoVeredito {
  /** Id do CampoConferido — identidade estavel do registro (key de lista). */
  id: string;
  /** `nomeCampo` persistido, ex.: `serie-placa`. */
  campo: string;
  /**
   * Vista esperada do campo, RE-RESOLVIDA da checklist do ProjetoModelo da
   * peca no momento da leitura — `CampoConferido` nao persiste a fonte fisica.
   * `null` quando a peca nao tem projeto vinculado, quando a checklist esta
   * ilegivel ou quando o campo nao aparece mais nela.
   */
  fonteFisica: string | null;
  /**
   * Obrigatoriedade do campo, da mesma origem (e com as mesmas ressalvas) de
   * `fonteFisica`. Viaja junto porque e o que explica um `nao_conferivel` que
   * NAO derrubou o veredito geral: campo opcional ilegivel nao bloqueia o
   * conforme (criterio 4 do SPEC).
   */
  obrigatorio: boolean | null;
  valorEsperado: string;
  valorLido: string | null;
  confianca: number | null;
  veredito: string | null;
  /** Bounding box da leitura na foto, quando o extrator forneceu. */
  regiaoLeitura: string | null;
  fotoEvidencia: FotoEvidenciaResumo | null;
}

/**
 * Releitura completa de uma conferencia: o mesmo veredito campo a campo que a
 * resposta do POST devolveu, remontavel a qualquer momento (refresh, navegacao
 * entre telas, abertura pelo historico).
 */
export interface VereditoConferencia {
  conferencia: {
    id: string;
    vereditoGeral: string | null;
    createdAt: Date;
    observacao: string | null;
    checkpoint: { codigo: string; nome: string; ordem: number } | null;
  };
  transformador: {
    id: string;
    numeroSerie: string;
    patrimonio: string;
    cliente: string;
  };
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
