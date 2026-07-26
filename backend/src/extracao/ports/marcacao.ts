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
 * COMO A MARCACAO FOI GRAVADA, como vocabulario fechado.
 *
 * - `relevo`: gravado no metal, mesma cor do tanque (serie chumbada);
 * - `tinta`: serigrafia preta sobre o tanque;
 * - `qr`: QR Code impresso NA PECA (o da placa de identificacao). Nao e texto
 *   que alguem le: e dado binario com correcao de erro, decodificado
 *   LOCALMENTE (`adapters/qr-imagem.ts`), sem OCR e sem AWS;
 * - `indefinido`: o nome do campo nao diz. Inclui de proposito os campos de
 *   PLACA (`serie-placa`, `patrimonio-placa`): a placa da TRAEL e preta com
 *   texto claro, mas placa clara com texto escuro existe, e amarrar o tipo dela
 *   a um modelo especifico seria falso conhecimento. Placa resolve por ROTULO
 *   (`N°`/`PATRIMONIO`), que e evidencia melhor que fisica de pixel.
 */
export type TipoDeMarcacao = 'relevo' | 'tinta' | 'qr' | 'indefinido';

/**
 * Tipo de marcacao esperado num campo, derivado do NOME (mesma limitacao,
 * mesma saida futura e mesma falha segura descritas em `ehMarcacaoEmRelevo`).
 *
 * `-serigrafia-` e o segmento que a checklist do seed usa para tinta
 * (`patrimonio-serigrafia-topo`), espelhando `-chumbada-` para relevo. Campo
 * que nao declara nenhum dos dois fica `indefinido` — e `indefinido` NUNCA e
 * casado por contraste, entao esquecer de nomear degrada para o comportamento
 * de hoje (campo nulo, `nao_conferivel`), nunca para uma leitura chutada.
 *
 * `qr` e testado PRIMEIRO porque ele nao e uma variacao de como o numero foi
 * pintado: e outro CANAL de leitura. Campo `qr` nao passa por OCR, nao entra na
 * discriminacao por contraste (`adapters/contraste.ts`, que so casa `relevo` e
 * `tinta`) e nao e relido em recortes — releitura de recorte existe para
 * enquadramento de texto, e QR ou decodifica ou nao decodifica.
 */
export function tipoDeMarcacaoDoCampo(campo: string): TipoDeMarcacao {
  if (ehMarcacaoQr(campo)) {
    return 'qr';
  }

  if (ehMarcacaoEmRelevo(campo)) {
    return 'relevo';
  }

  return segmentos(campo).some((segmento) => segmento.startsWith('serigrafia'))
    ? 'tinta'
    : 'indefinido';
}

/**
 * Marcacao que e um QR Code na peca (`serie-placa-qr`, `patrimonio-placa-qr`),
 * derivada do NOME DO CAMPO — mesma limitacao e mesma saida futura de
 * `ehMarcacaoEmRelevo` (gap 19 do CLAUDE.md: a checklist ainda nao declara o
 * tipo de marcacao).
 *
 * Segmento EXATO `qr`, nunca substring: um campo `serie-qrx` ou um cliente que
 * escreva `esquerda` continuam fora.
 *
 * FALHA SEGURA NOS DOIS SENTIDOS: campo de QR sem `qr` no nome so deixa de ser
 * decodificado (fica nulo -> `nao_conferivel`, o comportamento de sempre);
 * campo de texto batizado com `-qr-` por engano nao recebe leitura de OCR e
 * tambem fica nulo. Nenhum dos dois caminhos produz um valor chutado, que e a
 * unica coisa que a regra de ouro proibe aqui.
 *
 * Nome absurdo (`serie-chumbada-qr`) tambem falha seguro, so que de forma cara:
 * `ehMarcacaoEmRelevo` continua verdadeiro, entao a engine exigiria
 * corroboracao por recorte de uma leitura que o decode nunca corrobora — o
 * campo sai `nao_conferivel`, nunca acusado e nunca aprovado por engano.
 */
export function ehMarcacaoQr(campo: string): boolean {
  return segmentos(campo).includes('qr');
}

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
  // Segmentos do nome, nunca `includes` solto: 'descumbrado' nao e chumbado.
  // 'relevo' entra como escape para o cliente que nomear a posicao de outro
  // jeito ('serie-relevo-topo') sem esperar a checklist estruturada.
  return segmentos(campo).some(
    (segmento) => segmento.startsWith('chumbad') || segmento === 'relevo',
  );
}

/** Segmentos do nome do campo, sem acento e em caixa baixa. */
function segmentos(campo: string): string[] {
  return campo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split('-');
}
