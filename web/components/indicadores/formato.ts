/**
 * Formatação de EXIBIÇÃO dos indicadores — texto, nunca decisão.
 *
 * O vocabulário compartilhado vem pronto de outras telas em vez de ser copiado:
 * `rotuloCampo` (prefixo do campo → "Número de série") de
 * `components/conferencia/rotulos`, e `descreverEtapa`/`formatarDataHora` de
 * `components/peca/formato`. Uma terceira cópia de "Peça inteira" divergiria na
 * primeira mudança de texto — e esta tela é a que mais precisa falar igual às
 * outras, porque agrega o que elas mostram uma peça por vez.
 */

const INTEIRO = new Intl.NumberFormat("pt-BR");

/** `1284` → `1.284`. Contagem sempre com separador de milhar. */
export function formatarInteiro(valor: number): string {
  return Number.isFinite(valor) ? INTEIRO.format(valor) : "—";
}

/**
 * `serie-chumbada-lateral-direita` → `chumbada lateral direita`.
 *
 * Só cosmética: o prefixo (que é contrato da API) vira o rótulo legível pelo
 * `rotuloCampo`, e o RESTO do nome — como a marcação foi gravada e em qual
 * vista ela está — é apenas des-hifenizado. Nada é deduzido: o nome cru
 * continua visível ao lado, para o operador falar com o suporte usando o nome
 * que o sistema usa.
 */
export function detalheDoCampo(campo: string): string | null {
  const partes = campo.split("-");
  if (partes.length < 2) return null;

  const resto = partes.slice(1).join(" ").trim();
  return resto.length > 0 ? resto : null;
}
