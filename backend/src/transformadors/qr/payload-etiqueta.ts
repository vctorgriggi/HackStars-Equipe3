/**
 * Tipos do payload lido do QR Code da etiqueta do transformador.
 *
 * Identificadores de dominio em portugues sem acentos, sem enums
 * (unioes literais) e sem dependencia de Nest/IO.
 */
export interface PayloadEtiqueta {
  numeroSerie: string;
  patrimonio: string;
  cliente: string | null;
  pedido: string | null;
  seq: string | null;
  descricao: string | null;
  codigoProjeto: string | null; // ex.: 'TPD-408136'
}

export type ResultadoParse =
  | { tipo: 'completo'; dados: PayloadEtiqueta }
  | { tipo: 'codigo'; codigo: string }; // QR so com codigo de lookup

export class PayloadInvalidoError extends Error {
  constructor(public readonly motivo: string) {
    super(motivo);
    this.name = 'PayloadInvalidoError';
    Object.setPrototypeOf(this, PayloadInvalidoError.prototype);
  }
}
