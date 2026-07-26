import { normalizar } from './normalizacao';
import { ModoComparacao } from './tipos';

// CRITERIO DE IGUALDADE TEXTUAL da engine. Funcao pura, em arquivo proprio pelo
// mesmo motivo de `coerencia.ts` e `corroboracao.ts`: e uma regra com
// argumento, nao um detalhe do laco.
//
// POR QUE EXISTE O SEGUNDO MODO (medido em 2026-07-26, Textract real no ar,
// gap 21): `cliente-serigrafia-frente` saia `divergente` com lido `energisa`
// @ 0.9967 contra o esperado `143091 - Energisa Rondonia Distribuidora de
// Energia S.A`, que e o cliente do QR. Divergente FALSO: a peca esta gravada
// como o projeto manda — a serigrafia carrega a MARCA, a etiqueta carrega a
// RAZAO SOCIAL com o codigo do cliente. Com QR real isso acontecia SEMPRE, e
// quebrava o criterio 2 do SPEC ("o unico campo divergente e a serie da
// placa"). O gabarito do spike (scripts/spike-extracao.ts) ja media o cliente
// com modo 'contem'; a engine e que nunca ganhou isso.
//
// O QUE ESTE MODO NAO E — e a distincao importa, porque afrouxar comparacao e
// exatamente como nasce o falso OK:
//   - nao e similaridade, distancia de edicao nem percentual de acerto. A
//     decisao em aberto "campo parcialmente legivel" continua resolvida como
//     REJEITAR SEMPRE (limiar 0.9 medido);
//   - nao e substring: o lido tem de ser TOKEN INTEIRO (ou sequencia de tokens
//     consecutivos). `ener` nao aprova `energisa`, e `847233` nunca casaria com
//     `8472330` por pedaco;
//   - nao vale ao contrario: o lido tem de caber DENTRO do esperado. Leitura
//     que diz MAIS do que a etiqueta afirma nao e confirmada pela etiqueta;
//   - nao toca lastro nenhum. Limiar, corroboracao, coerencia e conflito de
//     leituras seguem identicos — o modo so responde "estes dois textos sao o
//     mesmo dado?".
//
// LIMITE CONHECIDO, aceito: em modo `contem-token`, QUALQUER token inteiro do
// esperado aprova (ler so `energia` aprovaria a razao social acima). Vale
// somente para campo de cliente, onde o dado e nome proprio de empresa e o
// esperado nao e um identificador — nenhum campo `serie-*` ou `patrimonio-*`
// usa este modo (a decisao e do chamador, em ORIGENS_DO_ESPERADO).

/** Marcas de acento isoladas pelo NFD (a decomposicao canonica). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g;

/** Separador de token: tudo que nao e letra nem numero. */
const NAO_ALFANUMERICO = /[^\p{L}\p{N}]+/gu;

/**
 * Tokens comparaveis de um texto: sem acento, em caixa baixa, quebrados por
 * qualquer caractere que nao seja letra ou numero. `143091 - Energisa Rondônia`
 * vira ['143091', 'energisa', 'rondonia'].
 *
 * O acento cai aqui (e NAO em `normalizar`, que so faz NFC): a serigrafia da
 * peca imprime `RONDONIA` onde o cadastro escreve `Rondônia`, e nesse eixo
 * acento e ruido tipografico, nao dado. Em `exato` nada disso muda — la a
 * perda de acento continua divergente, como sempre foi.
 */
export function tokenizar(valor: string): string[] {
  return valor
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .split(NAO_ALFANUMERICO)
    .filter((token) => token.length > 0);
}

/**
 * Os dois textos afirmam o mesmo dado, segundo o `modo` que o CHAMADOR
 * escolheu para o campo? Nunca decide o modo sozinha — a engine nao conhece
 * prefixo de campo.
 */
export function valoresBatem(
  valorEsperado: string,
  valorLido: string,
  modo: ModoComparacao,
): boolean {
  if (modo === 'exato') {
    return normalizar(valorLido) === normalizar(valorEsperado);
  }

  const esperado = tokenizar(valorEsperado);
  const lido = tokenizar(valorLido);

  // Texto sem token nenhum ('- . -', so pontuacao) nao afirma nada: nunca
  // aprova. Sem esta guarda, o join vazio casaria com qualquer esperado.
  if (esperado.length === 0 || lido.length === 0) {
    return false;
  }

  // Sequencia CONSECUTIVA: os espacos das bordas ancoram o casamento em
  // fronteira de token, o que descarta pedaco de palavra de graca.
  return ` ${esperado.join(' ')} `.includes(` ${lido.join(' ')} `);
}
