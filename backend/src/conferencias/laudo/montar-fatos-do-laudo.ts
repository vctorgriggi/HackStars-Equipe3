import {
  ContagensDoLaudo,
  DISCLAIMER_LAUDO,
  FatosDoLaudo,
} from '../../extracao/ports/redator.port';
import { VereditoConferencia } from '../consultas/veredito-conferencia';

/**
 * Traducao PURA do veredito persistido para o pacote de fatos do laudo.
 *
 * Por que ela existe separada do service: e aqui que se decide o que o modelo
 * de linguagem tem permissao de saber. Manter isso numa funcao sem I/O torna a
 * fronteira testavel sem AWS e sem banco — e um campo novo so chega ao prompt
 * se alguem o acrescentar aqui, de proposito.
 *
 * O que NAO entra, e por que:
 * - `motivo` do campo, `incoerencias` e `achadosInconsistentes`: nao sao
 *   persistidos (gap 22 do CLAUDE.md). Recalcula-los na leitura seria rodar a
 *   engine uma segunda vez, com uma segunda chance de divergir da primeira —
 *   e um laudo que contradiz o veredito gravado e pior que um laudo mais pobre;
 * - ids, urls de foto e bounding box: nao viram frase e so aumentariam a
 *   superficie para o modelo inventar referencia.
 */
export function montarFatosDoLaudo(
  veredito: VereditoConferencia,
): FatosDoLaudo {
  const contagens = contarVereditos(veredito);

  return {
    peca: {
      numeroSerie: veredito.transformador.numeroSerie,
      patrimonio: veredito.transformador.patrimonio,
      cliente: veredito.transformador.cliente,
    },
    // Nome legivel, nao o `codigo`: o laudo e lido por gente. A ETAPA viaja
    // porque `conforme` de gate parcial nao atesta a peca inteira (gap 14) —
    // omiti-la produziria exatamente o falso OK que a regra de ouro proibe.
    etapaAvaliada: veredito.conferencia.checkpoint?.nome ?? null,
    vereditoGeral: veredito.conferencia.vereditoGeral,
    campos: veredito.campos.map((campo) => ({
      campo: campo.campo,
      veredito: campo.veredito,
      valorEsperado: campo.valorEsperado,
      valorLido: campo.valorLido,
      confianca: campo.confianca,
    })),
    contagens,
    observacao: veredito.conferencia.observacao,
    conferidaEm: veredito.conferencia.createdAt.toISOString(),
  };
}

/**
 * Contagem por veredito. Campo com veredito nao reconhecido cai em
 * `semVeredito` em vez de ser descartado: some-lo a nenhum balde faria
 * `conformes + divergentes + naoConferiveis` bater com `total` mentindo sobre
 * o que o banco tem.
 */
function contarVereditos(veredito: VereditoConferencia): ContagensDoLaudo {
  const contagens: ContagensDoLaudo = {
    total: veredito.campos.length,
    conformes: 0,
    divergentes: 0,
    naoConferiveis: 0,
    semVeredito: 0,
  };

  for (const campo of veredito.campos) {
    switch (campo.veredito) {
      case 'conforme':
        contagens.conformes += 1;
        break;
      case 'divergente':
        contagens.divergentes += 1;
        break;
      case 'nao_conferivel':
        contagens.naoConferiveis += 1;
        break;
      default:
        contagens.semVeredito += 1;
    }
  }

  return contagens;
}

/**
 * Cinto de seguranca do disclaimer.
 *
 * O prompt PEDE a frase final; um modelo de linguagem pode esquece-la, corta-la
 * no teto de tokens ou parafrasea-la. A obrigacao de "todo laudo sai marcado
 * como redigido por IA" nao pode depender de obediencia do modelo, entao o
 * texto e conferido aqui e a frase e carimbada quando falta.
 *
 * A comparacao ignora acento, caixa e pontuacao final justamente para nao
 * duplicar a frase quando o modelo a escreveu com uma variacao boba.
 */
export function garantirDisclaimer(texto: string): string {
  const limpo = texto.trim();

  return normalizar(limpo).includes(normalizar(DISCLAIMER_LAUDO))
    ? limpo
    : `${limpo}\n\n${DISCLAIMER_LAUDO}`;
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
