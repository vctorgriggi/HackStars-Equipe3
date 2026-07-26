import { IncoerenciaEntreCampos, LeituraCampo, ResultadoCampo } from './tipos';

// REGRA DE EVIDENCIA "ANTES DE ACUSAR, CONFIRME". Funcao pura, pos-processamento
// do resultado por campo — no mesmo lugar e no mesmo espirito de `coerencia.ts`.
//
// POR QUE EXISTE (medido em 2026-07-25, spike dos recortes): na serie CHUMBADA,
// relevo metalico da cor do tanque, o Textract le ERRADO com confianca alta. Na
// mesma foto e no mesmo valor CORRETO, so mudando a margem do recorte, a
// confianca oscilou de 37,3% a 95,5% — 58 pontos. E `847233 @ 84,3%` (certo)
// ficou a 0,3 ponto de `847833 @ 84,6%` (errado). Nessa faixa a confianca mede
// ENQUADRAMENTO, nao correcao: NENHUM limiar separa os dois. Um limiar mais alto
// so troca falso `divergente` por `nao_conferivel` em massa; o que falta nao e
// um numero melhor, e uma SEGUNDA EVIDENCIA.
//
// A REGRA: campo cuja marcacao e relevo nao vira `divergente` a partir de uma
// leitura sozinha. Para acusar, exige-se
//   (i)   as releituras por recorte concordarem (`corroboracao: 'confirmada'`,
//         produzida no adapter — `extracao/adapters/textract.extractor.ts`);
//   (ii)  confianca (a MENOR das tres) >= limiar — ja garantido pela engine, que
//         so chega a comparar depois do ramo (c); um campo abaixo do limiar
//         nunca e `divergente`, ele sai `confianca-abaixo-do-limiar`;
//   (iii) nenhuma posicao IRMA ter lido valor diferente (a incoerencia entre
//         irmaos que `coerencia.ts` ja calcula).
// Falhando (i) ou (iii): `nao_conferivel` com motivo `leitura-nao-corroborada`.
//
// POR QUE ISTO NAO FERE O INVARIANTE "A COERENCIA REBAIXA E NUNCA PROMOVE":
// este e o PRIMEIRO caso em que um `divergente` vira `nao_conferivel`, e e
// mudanca de politica deliberada (aprovada). O invariante que importa continua
// de pe, porque ele existe para proibir o FALSO OK — e `nao_conferivel` tambem
// barra o `conforme`:
//
//   - a peca NAO passa nos dois casos: campo obrigatorio `nao_conferivel`
//     bloqueia o veredito geral exatamente como `divergente` bloqueia;
//   - o que muda e a MENSAGEM ao operador: de "peca defeituosa" para "nao posso
//     afirmar, confira a foto". A acao humana correspondente e diferente
//     (re-inspecionar a posicao x mandar para retrabalho), e uma leitura isolada
//     de relevo nao e evidencia suficiente para parar a linha;
//   - o sentido do rebaixamento continua sendo o cauteloso: `divergente` ->
//     `nao_conferivel` -> (nunca) `conforme`. Nada aqui produz `conforme`, e um
//     campo em relevo que BATE com o QR continua `conforme` como antes — a regra
//     restringe ACUSACAO, nao aprovacao (quem cuida da aprovacao e o limiar e a
//     anulacao da leitura contraditoria, no adapter).
//
// O QUE ESTA FUNCAO NUNCA FAZ: eleger leitura vencedora, contar votos, olhar
// confianca para desempatar ou transformar ausencia de irma em corroboracao.
//
// CONSEQUENCIA CONHECIDA do item (iii), aceita: "irma" e o campo de MESMO VALOR
// ESPERADO (definicao de `coerencia.ts`), e isso inclui a PLACA. Peca gravada
// errada nas 3 posicoes chumbadas, com a placa certa, sai `nao_conferivel` nas
// tres em vez de `divergente` — o grupo discorda, e a regra se recusa a acusar.
// A peca segue barrada (nao passa), e a mensagem vira "confira as posicoes".
// Refinar isto exigiria agrupar por TIPO DE MARCACAO (so relevo com relevo), o
// que hoje seria mais uma deducao pelo nome do campo; quando a checklist
// declarar `tipoMarcacao` (gap 5 / Fase 6), o grupo do item (iii) pode passar a
// ser "as outras posicoes em relevo" e este caso vira `divergente` de novo.
// Fixado em teste para nao mudar por acidente.

/** Campos que o grupo de irmaos acusou de discordar entre si. */
function camposComIrmaDiscordante(
  incoerencias: IncoerenciaEntreCampos[],
): Set<string> {
  const campos = new Set<string>();

  for (const incoerencia of incoerencias) {
    for (const campo of incoerencia.campos) {
      campos.add(campo);
    }
  }

  return campos;
}

/**
 * Aplica a regra sobre o resultado ja montado pela engine. Devolve uma lista
 * NOVA (os campos rebaixados sao objetos novos); nao muta nada.
 *
 * Campo sem `corroboracao` na leitura passa incolume — inclusive
 * `serie-placa`, que e texto IMPRESSO e le a 99,9%: o criterio 2 do SPEC ("o
 * unico campo divergente e a serie da placa") depende disso e esta fixado em
 * teste.
 */
export function aplicarRegraDeCorroboracao(
  campos: ResultadoCampo[],
  incoerencias: IncoerenciaEntreCampos[],
  leituras: LeituraCampo[],
): ResultadoCampo[] {
  const discordantes = camposComIrmaDiscordante(incoerencias);

  return campos.map((campo) => {
    if (campo.veredito !== 'divergente') {
      return campo;
    }

    const corroboracao = leituras.find(
      (leitura) => leitura.campo === campo.campo,
    )?.corroboracao;

    // Marcacao que nao exige corroboracao (tinta, impresso, leitura digitada):
    // segue exatamente como a engine decidiu.
    if (corroboracao === undefined) {
      return campo;
    }

    const naoCorroborada = corroboracao !== 'confirmada';
    const irmaDiscorda = discordantes.has(campo.campo);
    if (!naoCorroborada && !irmaDiscorda) {
      return campo;
    }

    return {
      ...campo,
      veredito: 'nao_conferivel' as const,
      motivo: 'leitura-nao-corroborada' as const,
    };
  });
}
