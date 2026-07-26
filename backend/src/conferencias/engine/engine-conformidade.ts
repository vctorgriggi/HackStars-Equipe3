import { detectarIncoerencias } from './coerencia';
import { valoresBatem } from './comparacao';
import { aplicarRegraDeCorroboracao } from './corroboracao';
import { normalizar, temConteudo } from './normalizacao';
import {
  ItemChecklist,
  LeituraCampo,
  MotivoCampo,
  OpcoesEngine,
  ResultadoCampo,
  ResultadoConferencia,
  Veredito,
} from './tipos';

// Engine de conformidade: funcao pura. Sem I/O, SDK, Nest ou repositorio —
// so os tipos locais. Todo parametro de politica (limiar, checklist, valores
// esperados) entra por argumento; nada de constante enterrada.

// `normalizar` mudou de arquivo (`normalizacao.ts`) para poder ser usada
// tambem pela coerencia entre irmaos sem ciclo de import; segue exportada
// daqui porque execucao e extracao ja importavam por este caminho.
export { normalizar };

/**
 * Política de LASTRO: quando uma leitura pode sustentar uma afirmação sobre a
 * peça. Uma função só (achado M1 da revisão): a mesma regra vivia escrita duas
 * vezes com os sinais invertidos — aqui no ramo (c) e no `dedupeLeituras` da
 * execução —, e a decisão em aberto "campo parcialmente legível" mudaria uma e
 * deixaria a outra para trás.
 *
 * `confianca <= 0` nunca é lastro, mesmo com `limiar` 0 (regra de ouro): sem
 * essa guarda, limiar 0 + confiança 0 viraria `conforme`.
 */
export function temLastro(
  confianca: number | null | undefined,
  limiar: number,
): boolean {
  return (
    confianca !== null &&
    confianca !== undefined &&
    confianca > 0 &&
    confianca >= limiar
  );
}

function montarCampo(
  item: ItemChecklist,
  valorEsperado: string | null,
  valorLido: string | null,
  confianca: number | null,
  veredito: Veredito,
  motivo?: MotivoCampo,
  campoDaLeitura?: string,
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
    ...(campoDaLeitura === undefined ? {} : { campoDaLeitura }),
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

    // (b) sem leitura ou leitura vazia. Quando a leitura chegou marcada como
    // NAO CORROBORADA e mesmo assim veio vazia, foi o adapter que a anulou —
    // os recortes da mesma regiao leram numeros diferentes (`recortes-discordam`).
    // O motivo separa "ninguem fotografou esta posicao" de "li e me contradisse",
    // que sao idas diferentes ate a peca.
    if (!temConteudo(valorLido)) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          leitura?.corroboracao === 'nao-confirmada'
            ? 'leitura-nao-corroborada'
            : 'sem-leitura',
        ),
      );
      continue;
    }

    // (b2) leituras conflitantes: o chamador registrou que outra leitura
    //
    // PRECEDENCIA (b2) ANTES de (b3), fixada por teste: uma leitura pode chegar
    // `conflitante` E `trocado` ao mesmo tempo. Os dois caminhos dao
    // `nao_conferivel` — muda so o motivo que o humano le —, e o conflito e o
    // fato mais primario: duas leituras validas DESTE campo ja se
    // contradisseram, entao nem da para afirmar que a vencedora e a marcacao do
    // vizinho. Investigar "o campo tem evidencias contraditorias" vem antes de
    // "a evidencia que sobrou parece de outro campo".
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
    //
    // `campoDaLeitura` viaja junto: sem ele o operador sabe "leitura de outro
    // campo" mas não de QUAL, e é essa informação que separa "reenquadre a
    // foto" de "a peça foi gravada com o número errado" (NC de verdade).
    if (leitura?.trocado) {
      campos.push(
        montarCampo(
          item,
          valorEsperadoBruto,
          valorLido,
          confianca,
          'nao_conferivel',
          'leitura-de-outro-campo',
          leitura.campoDaLeitura,
        ),
      );
      continue;
    }

    // (c) dado sem lastro nunca vira conforme, mesmo batendo com o esperado.
    // A política de lastro é `temLastro` (uma função só, compartilhada com o
    // dedupe da execução) — não uma condição reescrita aqui.
    if (!temLastro(confianca, opcoes.limiarConfianca)) {
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

    // (d) comparacao propriamente dita. O CRITERIO de igualdade e politica do
    // chamador (`modosPorCampo`), como o limiar: default `exato`, e
    // `contem-token` so onde foi MEDIDO que a peca e a etiqueta escrevem o
    // mesmo dado de formas diferentes (campo de cliente — a serigrafia traz a
    // marca, o QR traz a razao social). A engine nao deduz o modo: nao conhece
    // prefixo de campo. Regra e limites em `comparacao.ts`.
    const modo = opcoes.modosPorCampo?.[item.campo] ?? 'exato';
    const veredito: Veredito = valoresBatem(valorEsperadoBruto, valorLido, modo)
      ? 'conforme'
      : 'divergente';
    campos.push(
      montarCampo(item, valorEsperadoBruto, valorLido, confianca, veredito),
    );
  }

  // POS-PROCESSAMENTO (fora do laco, derivado do resultado por campo): campos
  // que o QR manda carregar o MESMO valor e nao leram a mesma coisa. Regra
  // inteira e o porque de cada exclusao em `coerencia.ts`.
  //
  // ORDEM, e ela importa: a coerencia sai PRIMEIRO porque a regra de
  // corroboracao consome a discordancia entre irmaos (item iii). Depois de
  // rebaixar, a coerencia e RECALCULADA — os grupos nao mudam (agrupam por
  // valor esperado e valor lido, nunca por veredito), mas cada leitura do grupo
  // carrega o veredito do seu campo, e ele so agora e final.
  const incoerenciasIniciais = detectarIncoerencias(campos);
  const camposFinais = aplicarRegraDeCorroboracao(
    campos,
    incoerenciasIniciais,
    leituras,
  );
  const incoerencias = detectarIncoerencias(camposFinais);

  // Precedencia: divergente > nao_conferivel (so obrigatorio bloqueia, OU ha
  // incoerencia entre irmaos, OU nenhum campo foi de fato verificado) >
  // conforme. Agregada DEPOIS do rebaixamento: o ultimo `divergente` da
  // conferencia pode ter virado `nao_conferivel` aqui, e o veredito geral
  // precisa acompanhar (continua sem passar — so muda a mensagem).
  const temDivergente = camposFinais.some(
    (campo) => campo.veredito === 'divergente',
  );
  const temObrigatorioNaoConferivel = camposFinais.some(
    (campo) => campo.obrigatorio && campo.veredito === 'nao_conferivel',
  );
  // `conforme` e uma AFIRMACAO sobre a peca, e afirmacao exige verificacao:
  // sem nenhum campo conforme nao ha o que afirmar (achado A1 da revisao
  // adversarial). Sem esta guarda, um recorte so com itens OPCIONAIS e zero
  // leitura saia `conforme` com todos os campos `nao_conferivel` — e um recorte
  // de opcionais SEM valor esperado saia `conforme` com `campos: []`, o falso
  // OK perfeito. Hoje o seed nao alcanca isso (toda etapa tem obrigatorio), mas
  // a checklist e DADO: a Fase 6 vai escreve-la com um LLM.
  const temConforme = camposFinais.some(
    (campo) => campo.veredito === 'conforme',
  );

  let vereditoGeral: Veredito = 'conforme';
  if (temDivergente) {
    vereditoGeral = 'divergente';
  } else if (
    temObrigatorioNaoConferivel ||
    incoerencias.length > 0 ||
    !temConforme
  ) {
    // Incoerencia REBAIXA e nunca promove: `divergente` continua vencendo
    // (defeito real da peca jamais vira "ruido de OCR"), e o unico caminho que
    // ela abre e conforme -> nao_conferivel.
    //
    // Na pratica isso so muda o resultado quando quem discorda e um campo
    // OPCIONAL — o obrigatorio ja bloqueia sozinho. E o buraco que faltava:
    // uma posicao opcional que leu OUTRO NUMERO nao e "opcional ilegivel"
    // (criterio 4 do SPEC, que de fato nao bloqueia); e uma peca sobre a qual
    // o sistema nao pode afirmar `conforme`.
    vereditoGeral = 'nao_conferivel';
  }

  return { vereditoGeral, campos: camposFinais, incoerencias };
}
