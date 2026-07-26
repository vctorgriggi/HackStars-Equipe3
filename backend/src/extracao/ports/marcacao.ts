// COMO A MARCACAO FOI GRAVADA NA PECA. Vive ao lado de `FonteFisica` (que diz
// QUAL VISTA a foto mostra) pelo mesmo motivo: e vocabulario de dominio que a
// extracao e a conformidade precisam ler IGUAL, e uma fonte unica em codigo
// evita as duas divergirem em silencio.
//
// POR QUE EXISTE (medido em 2026-07-25, spike dos recortes): o Textract le a
// serie CHUMBADA — relevo metalico da cor do tanque — ERRADO com confianca
// alta. Na mesma foto, so mudando a margem do recorte, a confianca do MESMO
// valor correto oscilou de 37,3% a 95,5%; e `847233 @ 84,3%` (certo) ficou a
// 0,3 ponto de `847833 @ 84,6%` (errado). Nessa faixa a confianca mede
// ENQUADRAMENTO, nao correcao — nenhum limiar separa os dois. Tinta preta
// (serigrafia) e placa impressa nao tem esse comportamento: leem entre 98,4% e
// 99,9% quando acertam.
//
// A consequencia esta em dois lugares, e os dois perguntam a esta funcao:
//   1. `TextractExtractor` corrobora a leitura relendo recortes (consenso);
//   2. a engine se recusa a ACUSAR `divergente` uma marcacao em relevo a
//      partir de uma leitura sozinha (`engine/corroboracao.ts`).

/**
 * Marcacao gravada em RELEVO (baixo contraste), derivada do NOME DO CAMPO.
 *
 * LIMITACAO CONHECIDA, deliberada: a checklist do ProjetoModelo nao declara
 * "tipo de marcacao" hoje — ela tem `campo`, `fonteFisica`, `obrigatorio` e
 * `etapa`, e e um varchar sem validacao estrutural (gap 5 do CLAUDE.md).
 * Derivar do nome amarra a regra a uma convencao de nomenclatura (a da TRAEL),
 * exatamente a alternativa que `coerencia.ts` descartou para agrupar irmaos.
 * A diferenca que justifica a escolha aqui: agrupar irmaos tinha um substituto
 * melhor e sem custo (o VALOR ESPERADO ja e entrada da engine), e "como a
 * marcacao foi gravada" nao tem nenhum substituto nos dados de hoje —
 * inventar coluna a mao romperia a regra de que entidade e propriedade entram
 * pelos generators, e a alternativa real seria adiar a protecao ate a Fase 6.
 *
 * A SAIDA e a mesma prevista para o resto: quando a checklist virar jsonb com
 * validacao (gap 5) ou a ingestao do projeto existir (Fase 6), o item ganha
 * `tipoMarcacao: 'relevo' | 'tinta' | 'impresso'` e esta funcao passa a ser o
 * FALLBACK de checklist antiga, nao a fonte.
 *
 * FALHA SEGURA NOS DOIS SENTIDOS: falso negativo (campo em relevo com nome
 * fora do padrao) devolve o comportamento de hoje — o campo pode ser acusado
 * `divergente` por uma leitura so, que e o risco que ja se corria. Falso
 * positivo (campo em tinta com 'chumbad' no nome) custa duas releituras e
 * troca um `divergente` por `nao_conferivel`: mais caro e mais cauteloso,
 * nunca um `conforme` a mais.
 */
export function ehMarcacaoEmRelevo(campo: string): boolean {
  const normalizado = campo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Segmentos do nome, nunca `includes` solto: 'descumbrado' nao e chumbado.
  // 'relevo' entra como escape para o cliente que nomear a posicao de outro
  // jeito ('serie-relevo-topo') sem esperar a checklist estruturada.
  return normalizado
    .split('-')
    .some(
      (segmento) => segmento.startsWith('chumbad') || segmento === 'relevo',
    );
}
