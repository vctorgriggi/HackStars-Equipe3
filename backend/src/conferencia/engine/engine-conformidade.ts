import {
  ItemChecklist,
  LeituraCampo,
  OpcoesEngine,
  ResultadoCampo,
  ResultadoConferencia,
  Veredito,
} from './tipos';

// Engine de conformidade: funcao pura. Sem I/O, SDK, Nest ou repositorio —
// so os tipos locais. Todo parametro de politica (limiar, checklist, valores
// esperados) entra por argumento; nada de constante enterrada.

/**
 * Normaliza um valor apenas para efeito de comparacao: trim, colapso de
 * espacos internos e caixa unica. Comparacao exata — nada de fuzzy match.
 *
 * DECISAO EM ABERTO: politica para campo parcialmente legivel (rejeitar
 * sempre x similaridade >= N% com revisao humana). Enquanto nao houver
 * decisao, so igualdade exata do valor normalizado vira `conforme`.
 */
function normalizar(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ').toLowerCase();
}

function temConteudo(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function montarCampo(
  item: ItemChecklist,
  valorEsperado: string | null,
  valorLido: string | null,
  confianca: number | null,
  veredito: Veredito,
  motivo?: string,
): ResultadoCampo {
  return {
    campo: item.campo,
    fonteFisica: item.fonteFisica,
    obrigatorio: item.obrigatorio,
    valorEsperado,
    valorLido,
    confianca,
    veredito,
    ...(motivo === undefined ? {} : { motivo }),
  };
}

export function conferir(
  checklist: ItemChecklist[],
  valoresEsperados: Record<string, string>,
  leituras: LeituraCampo[],
  opcoes: OpcoesEngine,
): ResultadoConferencia {
  const campos: ResultadoCampo[] = [];

  for (const item of checklist) {
    // Leituras de campos fora da checklist nunca sao alcancadas (regra 3).
    // Para campo repetido, a primeira leitura vence — reconciliar multiplas
    // leituras do mesmo campo nao e responsabilidade da engine nesta rodada.
    const leitura = leituras.find((atual) => atual.campo === item.campo);
    const valorLido = leitura?.valorLido ?? null;
    const confianca = leitura?.confianca ?? null;
    const valorEsperadoBruto: string | null | undefined =
      valoresEsperados[item.campo];

    // (a) sem valor esperado vindo do QR: opcional some do resultado,
    // obrigatorio fica registrado como nao conferivel.
    if (!temConteudo(valorEsperadoBruto)) {
      if (!item.obrigatorio) {
        continue;
      }
      campos.push(
        montarCampo(
          item,
          null,
          valorLido,
          confianca,
          'nao_conferivel',
          'sem-valor-esperado',
        ),
      );
      continue;
    }

    // (b) sem leitura ou leitura vazia.
    if (!temConteudo(valorLido)) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          'sem-leitura',
        ),
      );
      continue;
    }

    // (c) dado sem lastro nunca vira conforme, mesmo batendo com o esperado.
    if (confianca === null || confianca < opcoes.limiarConfianca) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          'confianca-abaixo-do-limiar',
        ),
      );
      continue;
    }

    // (d) comparacao propriamente dita.
    const veredito: Veredito =
      normalizar(valorLido) === normalizar(valorEsperadoBruto)
        ? 'conforme'
        : 'divergente';
    campos.push(
      montarCampo(item, valorEsperadoBruto, valorLido, confianca, veredito),
    );
  }

  // Precedencia: divergente > nao_conferivel (so obrigatorio bloqueia) >
  // conforme.
  const temDivergente = campos.some((campo) => campo.veredito === 'divergente');
  const temObrigatorioNaoConferivel = campos.some(
    (campo) => campo.obrigatorio && campo.veredito === 'nao_conferivel',
  );

  let vereditoGeral: Veredito = 'conforme';
  if (temDivergente) {
    vereditoGeral = 'divergente';
  } else if (temObrigatorioNaoConferivel) {
    vereditoGeral = 'nao_conferivel';
  }

  return { vereditoGeral, campos };
}
