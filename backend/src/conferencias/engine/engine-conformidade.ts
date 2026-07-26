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
export function normalizar(valor: string): string {
  // NFC: 'ô' precomposto e 'o'+combinante são o MESMO texto (equivalência
  // canônica Unicode) — sem isso, QR gerado em iOS/macOS (NFD) divergiria
  // de OCR em NFC. Não é fuzzy: perda de acento continua divergente.
  return valor.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
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

    // (b2) leituras conflitantes: o chamador registrou que outra leitura
    // valida discordava desta no valor normalizado. Nenhuma das duas e
    // confiavel — nem a que bate com o esperado (poderia ser a etiqueta
    // fotografada no lugar da placa). Vai para revisao humana com a foto.
    if (leitura?.conflitante) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          'leituras-conflitantes',
        ),
      );
      continue;
    }

    // (b3) marcação do vizinho: o valor lido é o esperado de OUTRO campo. A
    // foto mostrava mais de uma marcação e o extrator casou a errada — isso
    // não é divergência da peça, é leitura no lugar errado. Vai para revisão
    // humana com a foto, nunca para `divergente` (acusaria peça correta).
    if (leitura?.trocado) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          'leitura-de-outro-campo',
        ),
      );
      continue;
    }

    // (c) dado sem lastro nunca vira conforme, mesmo batendo com o esperado.
    // confianca <= 0 nunca é lastro, mesmo com limiar 0 (regra de ouro):
    // sem essa guarda, limiarConfianca=0 + confianca=0 viraria conforme.
    if (
      confianca === null ||
      confianca <= 0 ||
      confianca < opcoes.limiarConfianca
    ) {
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
