/**
 * Kit de UI do TRAEL Conferência — ponto único de importação.
 *
 * As telas importam daqui (`@/components/ui`) e não dos arquivos soltos: assim
 * o kit pode crescer sem obrigar as telas a mudar caminho de import.
 */

export { Botao, BotaoLink } from "./botao";
export type { BotaoProps, BotaoLinkProps, VarianteBotao, TamanhoBotao } from "./botao";

export { Cartao, CabecalhoCartao, CartaoAcao } from "./cartao";
export type { CartaoProps, CabecalhoCartaoProps, CartaoAcaoProps } from "./cartao";

export {
  SeloVeredito,
  SeloIncoerencia,
  EXPLICACAO_VEREDITO,
} from "./selo-veredito";
export type { SeloVereditoProps, ClasseSelo } from "./selo-veredito";

export { Aviso, AvisoDeErro } from "./aviso";
export type { AvisoProps, TomAviso } from "./aviso";

export {
  Carregando,
  CarregandoAcao,
  Esqueleto,
  BarraDeProgresso,
} from "./carregando";

export { CampoTexto, AreaTexto } from "./campo-texto";
export type { CampoTextoProps, AreaTextoProps } from "./campo-texto";

export { Chip } from "./chip";
export type { TomChip } from "./chip";
